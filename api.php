<?php

    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);

    $allowedUrls = [
        'https://stream.zeno.fm/yn65fsaurfhvv',
        'https://sv2.globalhostlive.com/proxy/bendistereo/stream2',
        // Adicione outras URLs permitidas aqui
    ];

    $disableUrlCheck = true; // Defina como true para desabilitar a verificação
    $requestsPerSecondLimit = 5;

    class StreamManager {
        private $allowedUrls;
        private $historyManager;
        private $disableUrlCheck;

        public function __construct(array $allowedUrls, bool $disableUrlCheck) {
            $this->allowedUrls = $allowedUrls;
            $this->disableUrlCheck = $disableUrlCheck;
        }

        public function getStreamTitle($streamingUrl, $interval = 19200): ?string {
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
            $readAttempts = 0; // Contador de tentativas de leitura
            while (!feof($stream) && $maxReads > 0 && $readAttempts < 5) { // Limita as tentativas de leitura
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
                $readAttempts++;
            }
            fclose($stream);
            return null;
        }

        public function extractArtistAndSong($title): array {
            $title = trim($title, "'");
            if (strpos($title, '-') !== false) {
                [$artist, $song] = explode('-', $title, 2);
                return [trim($artist), trim($song)];
            }
            return ['', trim($title)];
        }

        public function getAlbumArt($artist, $song): ?string {
            $url = 'https://itunes.apple.com/search?term=' . urlencode("$artist $song") . '&media=music&limit=1';
            $response = @file_get_contents($url);
            if ($response === false) {
                return null;
            }

            $data = json_decode($response, true);
            if (!empty($data) && isset($data['resultCount']) && $data['resultCount'] > 0) {
                return str_replace('100x100bb', '512x512bb', $data['results'][0]['artworkUrl100']);
            }
            return null;
        }

        public function updateHistory($url, $artist, $song): array {
            $this->historyManager = new HistoryManager($url);
            $this->historyManager->addSong($artist, $song);
            return $this->historyManager->getHistory(true);
        }
    }

    class HistoryManager {
        private $url;
        private $historyFile;
        private $historyLimit = 5;

        public function __construct($url) {
            $this->url = $url;
            $this->historyFile = $this->getHistoryFileName();
        }

        private function getHistoryFileName(): string {
            $historyDir = 'history';
            if (!file_exists($historyDir)) {
                mkdir($historyDir, 0755, true);
            }
            return $historyDir . '/' . hash('sha256', $this->url) . '.json';
        }

        public function loadHistory(): array {
            if (file_exists($this->historyFile)) {
                $history = json_decode(file_get_contents($this->historyFile), true);
                return $history !== null ? $history : [];
            }
            return [];
        }

        public function saveHistory(array $history): void {
            file_put_contents($this->historyFile, json_encode($history));
        }

        public function addSong($artist, $song): void {
            $history = $this->loadHistory();
            $currentSong = ["title" => $song, "artist" => $artist];

            // Verifica se a música já está no histórico
            $existingIndex = array_search($currentSong, array_column($history, 'song'));
            if ($existingIndex !== false) {
                // Remove a entrada existente para evitar duplicações
                unset($history[$existingIndex]);
            }

            // Adiciona a nova música no início do histórico
            array_unshift($history, ["song" => $currentSong]);

            // Limita o histórico ao número máximo de entradas
            $history = array_slice($history, 0, $this->historyLimit);

            $this->saveHistory($history);
        }

        public function getHistory(bool $ignoreFirst = true): array {
            $history = $this->loadHistory();
            return $ignoreFirst ? array_slice($history, 1) : $history;
        }
    }

    header('Content-Type: application/json');

    $url = $_GET['url'];
    $interval = isset($_GET['interval']) ? (int)$_GET['interval'] : 19200;

    // Verifica se a URL é válida
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        echo json_encode(["error" => "Invalid URL"]);
        exit;
    }

    // Verifica se a URL é permitida (somente se disableUrlCheck for false)
    if (!$disableUrlCheck && !in_array($url, $allowedUrls)) {
        echo json_encode(["error" => "URL not allowed, to use, send an email contato@jailson.es"]);
        exit;
    }

    // Implementa a limitação de taxa por URL
    if ($requestsPerSecondLimit > 0) {
        $lastRequestTime = isset($_SESSION['lastRequestTime'][$url])
                        ? $_SESSION['lastRequestTime'][$url] 
                        : 0;
        $currentTime = time();

        // Verifica se a diferença de tempo entre a última requisição e a atual é menor que 1 segundo
        if ($currentTime - $lastRequestTime < 1) {
            // Se o limite for excedido, retorna um erro
            echo json_encode(["error" => "Too many requests for this URL. Please try again later."]);
            exit;
        }

        // Atualiza o tempo da última requisição para a URL
        $_SESSION['lastRequestTime'][$url] = $currentTime;
    }

    $streamManager = new StreamManager($allowedUrls, $disableUrlCheck);
    $title = $streamManager->getStreamTitle($url, $interval);

    if ($title) {
        [$artist, $song] = $streamManager->extractArtistAndSong($title);
        $artUrl = $streamManager->getAlbumArt($artist, $song);
        $history = $streamManager->updateHistory($url, $artist, $song);

        // Cria a resposta JSON
        $response = [
            "currentSong" => $song,
            "currentArtist" => $artist,
            "songHistory" => $history
        ];
    } else {
        $response = ["error" => "Failed to retrieve stream title"];
    }

    echo json_encode($response);
?>