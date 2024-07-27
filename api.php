<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$allowedUrls = [
    'https://stream.zeno.fm/yn65fsaurfhvv',
    'https://sv2.globalhostlive.com/proxy/bendistereo/stream2',
    'https://azuracast.invictamix.pt:8093/emissao.mp3',
    'https://stream.radiorostova.ru/radio-rostova-high.mp3',

    // Adicione outras URLs permitidas aqui
];

function getMp3StreamTitle($streamingUrl, $interval) {
    $needle = 'StreamTitle=';
    $headers = [
        'Icy-MetaData: 1',
        'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.110 Safari/537.36'
    ];

    $context = stream_context_create([
        'http' => [
            'header' => implode("\r\n", $headers),
            'timeout' => 30 // Definindo um timeout para a conexão
        ]
    ]);

    $stream = @fopen($streamingUrl, 'r', false, $context);
    if ($stream === false) {
        return null;
    }

    $metaDataInterval = null;
    foreach ($http_response_header as $header) {
        if (stripos($header, 'icy-metaint') !== false) {
            $metaDataInterval = (int)trim(explode(':', $header)[1]);
            break;
        }
    }

    if ($metaDataInterval === null) {
        fclose($stream);
        return null;
    }

    $offset = 0;
    $maxReads = 10; // Definindo um número máximo de leituras para evitar loops infinitos
    while (!feof($stream) && $maxReads > 0) {
        fread($stream, $metaDataInterval);
        $buffer = fread($stream, $interval);
        $titleIndex = strpos($buffer, $needle);
        if ($titleIndex !== false) {
            $title = substr($buffer, $titleIndex + strlen($needle));
            $title = substr($title, 0, strpos($title, ';'));
            fclose($stream);
            return trim($title, "' ");
        }
        $offset += $metaDataInterval + $interval;
        $maxReads--;
    }
    fclose($stream);
    return null;
}

function extractArtistAndSong($title) {
    $title = trim($title, "'");
    if (strpos($title, '-') !== false) {
        [$artist, $song] = explode('-', $title, 2);
        return [trim($artist), trim($song)];
    }
    return ['', trim($title)];
}

function getAlbumArt($artist, $song) {
    $url = 'https://itunes.apple.com/search?term=' . urlencode("$artist $song") . '&media=music&limit=1';
    $response = @file_get_contents($url);
    if ($response === false) {
        return null;
    }

    $data = json_decode($response, true);
    if ($data['resultCount'] > 0) {
        return str_replace('100x100bb', '512x512bb', $data['results'][0]['artworkUrl100']);
    }
    return null;
}

function getHistoryFileName($url, $ignoreFirst = true) {
    $suffix = $ignoreFirst ? '_ignore_first.json' : '.json';
    return 'history_' . md5($url) . $suffix;
}

function updateHistory($url, $artist, $song) {
    $historyFile = getHistoryFileName($url, false); // Alterado para não ignorar a primeira entrada
    $historyLimit = 5;

    if (!file_exists($historyFile)) {
        $history = [];
    } else {
        $history = json_decode(file_get_contents($historyFile), true);
        if ($history === null) {
            $history = [];
        }
    }

    // Verifica se a música já está no histórico
    $currentSong = ["title" => $song, "artist" => $artist];
    $existingIndex = array_search($currentSong, array_column($history, 'song'));
    if ($existingIndex !== false) {
        // Remove a entrada existente para evitar duplicações
        array_splice($history, $existingIndex, 1);
    }

    // Adiciona a nova música no início do histórico
    array_unshift($history, ["song" => $currentSong]);
    $history = array_slice($history, 0, $historyLimit);
    file_put_contents($historyFile, json_encode($history));

    return $history;
}

header('Content-Type: application/json');

$url = $_GET['url'];
$interval = isset($_GET['interval']) ? (int)$_GET['interval'] : 19200;

if (!filter_var($url, FILTER_VALIDATE_URL)) {
    echo json_encode(["error" => "Invalid URL"]);
    exit;
}

if (!in_array($url, $allowedUrls)) {
    echo json_encode(["error" => "URL not allowed, to use, send an email contato@jailson.es"]);
    exit;
}

$title = getMp3StreamTitle($url, $interval);
if ($title) {
    [$artist, $song] = extractArtistAndSong($title);
    $artUrl = getAlbumArt($artist, $song);
    $history = updateHistory($url, $artist, $song);

    // Ignorar o primeiro elemento do histórico se existir
    $filteredHistory = array_slice($history, 1);

    $response = [
        "currentSong" => $song,
        "currentArtist" => $artist,
        "songHistory" => array_map(function($entry) {
            return [
                "artist" => $entry['song']['artist'],
                "song" => $entry['song']['title']
            ];
        }, $filteredHistory)
    ];
    
    echo json_encode($response);
} else {
    echo json_encode(["error" => "Failed to retrieve stream title"]);
}
