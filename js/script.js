const RADIO_NAME = 'Jailson Web Rádio';

// Change Stream URL Here, Supports, ICECAST, ZENO, SHOUTCAST, RADIOJAR and any other stream service.
const URL_STREAMING = 'https://stream.zeno.fm/yn65fsaurfhvv';

//API URL /
const API_URL = 'https://twj.es/free/?url='+URL_STREAMING;
const FALLBACK_API_URL = 'https://twj.es/metadata/?url=' + URL_STREAMING;

let userInteracted = true;

let musicaAtual = null;

// Cache para a API do iTunes
const cache = {};

window.addEventListener('load', () => {
    const page = new Page();
    page.changeTitlePage();
    page.setVolume();

    const radioName = document.getElementById('radioName');
    if (radioName) radioName.textContent = RADIO_NAME;

    const player = new Player();
    player.play();

    // Chama a função getStreamingData imediatamente quando a página carrega
    getStreamingData();

    // Define o intervalo para atualizar os dados de streaming a cada 10 segundos
    const streamingInterval = setInterval(getStreamingData, 10000);

    // A altura da capa é responsabilidade do CSS (aspect-ratio).
});

// Cache de letras: guarda a própria Promise (não só o resultado) para que
// duas chamadas quase simultâneas para a mesma música reaproveitem a mesma
// requisição em vez de martelar as APIs de novo.
const lyricsCache = {};

function fetchLyrics(currentArtist, currentSong) {
    const cacheKey = (currentArtist + ' - ' + currentSong).toLowerCase();
    if (lyricsCache[cacheKey]) {
        return lyricsCache[cacheKey];
    }

    const promise = (async function () {
        // A API do Vagalume foi descontinuada — busca em lyrics.ovh e,
        // se não encontrar, no LRCLIB (nenhuma exige chave de API).
        let lyric = null;
        try {
            const response = await fetch('https://api.lyrics.ovh/v1/' + encodeURIComponent(currentArtist) + '/' + encodeURIComponent(currentSong));
            const data = await response.json();
            if (data && data.lyrics) lyric = data.lyrics;
        } catch (error) {}

        if (!lyric) {
            try {
                const response = await fetch('https://lrclib.net/api/get?artist_name=' + encodeURIComponent(currentArtist) + '&track_name=' + encodeURIComponent(currentSong));
                if (response.ok) {
                    const data = await response.json();
                    lyric = data.plainLyrics || data.syncedLyrics || null;
                }
            } catch (error) {}
        }

        if (!lyric) {
            try {
                const response = await fetch('https://lrclib.net/api/search?track_name=' + encodeURIComponent(currentSong) + '&artist_name=' + encodeURIComponent(currentArtist));
                if (response.ok) {
                    const results = await response.json();
                    const hit = Array.isArray(results) && results.find((r) => r.plainLyrics || r.syncedLyrics);
                    if (hit) lyric = hit.plainLyrics || hit.syncedLyrics;
                }
            } catch (error) {}
        }

        return lyric;
    })();

    lyricsCache[cacheKey] = promise;
    return promise;
}

// DOM control
class Page {
    constructor() {
        this.changeTitlePage = function (title = RADIO_NAME) {
            document.title = title;
        };

        this.refreshCurrentSong = function(song, artist) {
            const currentSong = document.getElementById('currentSong');
            const currentArtist = document.getElementById('currentArtist');
            const lyricsSong = document.getElementById('lyricsSong');
        
            if (song !== currentSong.textContent || artist !== currentArtist.textContent) { 
                // Esmaecer o conteúdo existente (fade-out)
                currentSong.classList.add('fade-out');
                currentArtist.classList.add('fade-out');
        
                setTimeout(function() {
                    // Atualizar o conteúdo após o fade-out
                    currentSong.textContent = song; 
                    currentArtist.textContent = artist;
                    lyricsSong.textContent = song + ' - ' + artist;
        
                    // Esmaecer o novo conteúdo (fade-in)
                    currentSong.classList.remove('fade-out');
                    currentSong.classList.add('fade-in');
                    currentArtist.classList.remove('fade-out');
                    currentArtist.classList.add('fade-in');
                }, 500); 
        
                setTimeout(function() {
                    // Remover as classes fade-in após a animação
                    currentSong.classList.remove('fade-in');
                    currentArtist.classList.remove('fade-in');
                }, 1000); 
            }
        };
          
        // Busca a capa de um card do histórico. Recebe o próprio elemento
        // <article> (o texto já foi preenchido na criação do card).
        this.refreshHistoric = async function (info, article) {
            const coverHistoric = article.querySelector(".cover-historic");
            const defaultCoverArt = "img/cover.png";

            // Extrai o título da música e o nome do artista,
            // tratando a possibilidade de 'song' e 'artist' serem objetos ou strings.
            const songTitle = typeof info.song === "object" ? info.song.title : info.song;
            const songArtist = typeof info.artist === "object" ? info.artist.title : info.artist;

            try {
                const data = await getCoverData(songArtist, songTitle, defaultCoverArt, defaultCoverArt);
                coverHistoric.style.backgroundImage = "url(" + (data.thumbnail || data.art || defaultCoverArt) + ")";
            } catch (error) {
                console.error("Erro ao buscar capa do histórico:", error);
                coverHistoric.style.backgroundImage = "url(" + defaultCoverArt + ")";
            }
        };
                
        this.refreshCover = async function (song = '', artist, apiArt = null) {
            const coverArt = document.getElementById('currentCoverArt');
            const coverBackground = document.getElementById('bgCover');
            const defaultCoverArt = 'img/cover.png';

            try {
                let art;
                let cover;

                if (apiArt) {
                    // A API do twj.es já entrega a capa pronta (albumArt) —
                    // usar direto evita uma busca extra e capas erradas
                    // por fuzzy match
                    art = apiArt;
                    cover = apiArt.replace('600x600', '1500x1500');
                } else {
                    const data = await getCoverData(artist, song, defaultCoverArt, defaultCoverArt);
                    art = data.art;
                    cover = data.cover;
                }

                // Aplica a imagem de capa (sempre, mesmo se for a padrão)
                coverArt.style.backgroundImage = 'url(' + art + ')';
                coverBackground.style.backgroundImage = 'url(' + cover + ')';

                // Adiciona/remove classes para animação (se necessário)
                coverArt.classList.add('animated', 'bounceInLeft');
                setTimeout(() => coverArt.classList.remove('animated', 'bounceInLeft'), 2000);

                // Atualiza MediaSession (se suportado)
                if ('mediaSession' in navigator) {
                    const artwork = [
                        { src: art, sizes: '96x96',   type: 'image/png' },
                        { src: art, sizes: '128x128', type: 'image/png' },
                        { src: art, sizes: '192x192', type: 'image/png' },
                        { src: art, sizes: '256x256', type: 'image/png' },
                        { src: art, sizes: '384x384', type: 'image/png' },
                        { src: art, sizes: '512x512', type: 'image/png' },
                    ];

                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: song,
                        artist: artist,
                        artwork
                    });
                }
            } catch (error) {
                console.log("Erro ao buscar a capa:", error);
            }
        };

        this.changeVolumeIndicator = function(volume) {
            document.getElementById('volIndicator').textContent = volume; // Use textContent em vez de innerHTML
          
            if (typeof Storage !== 'undefined') {
              localStorage.setItem('volume', volume);
            }
          };
          
        this.setVolume = function() {
            if (typeof Storage !== 'undefined') {
              const volumeLocalStorage = localStorage.getItem('volume') || 80; // Operador de coalescência nula (??)
          
              document.getElementById('volume').value = volumeLocalStorage;
              document.getElementById('volIndicator').textContent = volumeLocalStorage;
            }
          };

        this.refreshLyric = async function (currentSong, currentArtist) {
            const openLyric = document.getElementsByClassName('lyrics')[0];
            const modalLyric = document.getElementById('modalLyrics');

            const lyric = await fetchLyrics(currentArtist, currentSong);

            if (lyric) {
              document.getElementById('lyric').innerHTML = lyric.replace(/\n/g, '<br />');
              openLyric.style.opacity = "1";
              openLyric.setAttribute('data-toggle', 'modal');
            } else {
              openLyric.style.opacity = "0.3";
              openLyric.removeAttribute('data-toggle');

              // Esconde o modal caso esteja aberto com a letra da música anterior
              modalLyric.style.display = "none";
              modalLyric.setAttribute('aria-hidden', 'true');
              document.body.classList.remove('modal-open');
            }
        };
    }
}


async function getStreamingData() {
    try {
        let data = await fetchStreamingData(API_URL);
        if (!data) {
            data = await fetchStreamingData(FALLBACK_API_URL);
        }

        if (data) {
            const page = new Page();
            let currentSong = data.songtitle || (typeof data.song === "object" ? data.song.title : data.song) || "";
            let currentArtist = (typeof data.artist === "object" ? data.artist.title : data.artist) || "";

            // Metadata ICY costuma vir como "Artista - Título" no songtitle.
            // Sem separar, o nome do artista aparece duplicado na tela e a
            // busca de capa/letra vai poluída ("Artista - Artista - Título"),
            // retornando resultados errados no iTunes.
            if (currentSong.includes(" - ")) {
                const embeddedArtist = currentSong.split(" - ")[0].trim();
                const embeddedTitle = currentSong.substring(currentSong.indexOf(" - ") + 3).trim();

                if (!currentArtist) {
                    currentArtist = embeddedArtist;
                    currentSong = embeddedTitle;
                } else if (normalizeText(embeddedArtist) === normalizeText(currentArtist)) {
                    currentSong = embeddedTitle;
                }
            }

            const safeCurrentSong = (currentSong || "").replace(/'/g, "'").replace(/&/g, "&");
            const safeCurrentArtist = (currentArtist || "").replace(/'/g, "'").replace(/&/g, "&");

            if (safeCurrentSong !== musicaAtual) {
                document.title = `${safeCurrentSong} - ${safeCurrentArtist} | ${RADIO_NAME}`;

                page.refreshCover(safeCurrentSong, safeCurrentArtist, data.albumArt || data.art || null);
                page.refreshCurrentSong(safeCurrentSong, safeCurrentArtist);
                page.refreshLyric(safeCurrentSong, safeCurrentArtist);

                const historicContainer = document.getElementById("historicSong");
                historicContainer.innerHTML = "";

                const historyArray = data.song_history
                    ? data.song_history.map((item) => ({ song: item.song.title, artist: item.song.artist }))
                    : (data.history || []);

                // A API inclui a música que está tocando agora no topo do
                // histórico — filtra para não duplicar o now-playing
                // (tolerante a sufixos tipo "Me Refaz (Ao Vivo)" vs "ME REFAZ")
                const currentSongNorm = normalizeText(safeCurrentSong);
                const currentArtistNorm = normalizeText(safeCurrentArtist);
                const pastSongs = historyArray.filter((item) => {
                    const itemSong = normalizeText(typeof item.song === "object" ? item.song.title : item.song);
                    const itemArtist = normalizeText(typeof item.artist === "object" ? item.artist.title : item.artist);
                    const sameSong = itemSong === currentSongNorm || itemSong.startsWith(currentSongNorm) || currentSongNorm.startsWith(itemSong);
                    return !(itemArtist === currentArtistNorm && sameSong);
                });

                // song_history vem do mais recente para o mais antigo:
                // pega do TOPO (o slice antigo pegava as mais antigas)
                const maxSongsToDisplay = 4; // Adjust as needed
                const limitedHistory = pastSongs.slice(0, maxSongsToDisplay);

                for (let i = 0; i < limitedHistory.length; i++) {
                    const songInfo = limitedHistory[i];
                    const article = document.createElement("article");
                    article.classList.add("animated", "slideInRight");
                    article.innerHTML = `
                        <div class="cover-historic" style="background-image: url('img/cover.png');"></div>
                        <div class="music-info">
                          <div class="song"></div>
                          <div class="artist"></div>
                        </div>
                      `;
                    article.querySelector(".song").textContent = songInfo.song || "Desconhecido";
                    article.querySelector(".artist").textContent = songInfo.artist || "Desconhecido";
                    historicContainer.appendChild(article);
                    setTimeout(() => article.classList.remove("animated", "slideInRight"), 2000);
                    try {
                        // Passa o elemento (e não o índice): se o histórico for
                        // reconstruído enquanto a busca da capa está em voo, a
                        // resposta atrasada não pinta o card errado
                        page.refreshHistoric(songInfo, article);
                    } catch (error) {
                        console.error("Error refreshing historic song:", error);
                    }
                }
                musicaAtual = safeCurrentSong;
            }

            // Modo clipe — fora do guard de música nova: a API resolve o
            // youtubeId de forma assíncrona e ele pode chegar num poll
            // seguinte, com a mesma música
            handleClipTrack(data, safeCurrentSong, safeCurrentArtist);
        }
    } catch (error) {
        console.log("Erro ao buscar dados de streaming:", error);
    }
}

// ==================== MODO CLIPE (YouTube) ====================
// Quando a API entrega o youtubeId da música, o botão de clipe aparece.
// Ligado: o vídeo assume o lugar da capa, sincronizado com a rádio
// (start = elapsed). Pausar o vídeo retoma a rádio; dar play pausa.

let clipTrack = null;
let lastClipShownId = null;
let clipWasRadioPlaying = false;
const clipPlayingSet = new Set();

function clipModeOn() {
    return localStorage.getItem('clipMode') === '1';
}

function handleClipTrack(data, song, artist) {
    const yt = data.youtubeId || data.youtube_id || '';
    const np = data.now_playing || {};
    clipTrack = yt ? { id: yt, song, artist, elapsed: np.elapsed || 0, duration: np.duration || 0, receivedAt: Date.now() } : null;

    const btn = document.querySelector('.clip-toggle');
    if (btn && yt) btn.hidden = false; // a API suporta clipes: revela o botão

    if (!clipModeOn()) return;
    if (clipTrack) {
        openClip(clipTrack);
    } else {
        closeClip(true); // música sem clipe: volta para a rádio
    }
}

function openClip(track) {
    if (lastClipShownId === track.id) return;
    lastClipShownId = track.id;

    const coverBox = document.querySelector('.cover-album');
    if (!coverBox) return;

    // pausa INTENCIONAL da rádio (o watchdog não deve religar por cima)
    if (!audio.paused) {
        clipWasRadioPlaying = true;
        isIntentionalPause = true;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        fadeOut(function () { audio.pause(); });
    }

    // Sincroniza com a rádio: começa no ponto em que a música está.
    // Aproximado: o stream tem atraso de buffer e o clipe pode ser outra
    // versão da música (ao vivo vs estúdio).
    let start = 0;
    if (track.elapsed) {
        start = Math.floor(track.elapsed + (Date.now() - track.receivedAt) / 1000);
        if (track.duration && start >= track.duration - 5) start = 0;
        if (start < 8) start = 0;
    }

    coverBox.classList.add('is-clip');
    const oldFrame = coverBox.querySelector('iframe.clip-frame');
    if (oldFrame) oldFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.className = 'clip-frame';
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + track.id + '?autoplay=1&enablejsapi=1' + (start ? '&start=' + start : '');
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.title = 'Clipe: ' + (track.song || '');
    // handshake do widget: o player passa a emitir eventos de estado
    iframe.addEventListener('load', function () {
        iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'clip', channel: 'widget' }), '*');
    });
    coverBox.appendChild(iframe);
}

function closeClip(resumeRadio) {
    const coverBox = document.querySelector('.cover-album');
    if (coverBox) {
        coverBox.classList.remove('is-clip');
        const iframe = coverBox.querySelector('iframe.clip-frame');
        if (iframe) iframe.remove();
    }
    lastClipShownId = null;
    clipPlayingSet.clear();

    if (resumeRadio && clipWasRadioPlaying && audio.paused) {
        isIntentionalPause = false;
        fadeIn();
        audio.load();
        audio.play().catch(function () {});
    }
    clipWasRadioPlaying = false;
}

// Eventos de estado do player do YouTube: pausar o vídeo retoma a rádio,
// dar play de novo pausa a rádio
window.addEventListener('message', function (event) {
    let host = '';
    try { host = new URL(event.origin).hostname; } catch (e) { return; }
    if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return;

    let payload;
    try { payload = JSON.parse(event.data); } catch (e) { return; }
    const state = payload && payload.info && typeof payload.info.playerState === 'number' ? payload.info.playerState : null;
    if (state === null) return;

    const id = payload.id || 'clip';
    if (state === 1) { // vídeo tocando
        clipPlayingSet.add(id);
        if (!audio.paused) {
            clipWasRadioPlaying = true;
            isIntentionalPause = true;
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            fadeOut(function () { audio.pause(); });
        }
    } else if (state === 2 || state === 0) { // pausado ou terminou
        clipPlayingSet.delete(id);
        if (clipPlayingSet.size === 0 && clipWasRadioPlaying && audio.paused) {
            isIntentionalPause = false;
            fadeIn();
            audio.load();
            audio.play().catch(function () {});
        }
    }
});

// Botão liga/desliga do modo clipe
document.addEventListener('DOMContentLoaded', function () {
    const btn = document.querySelector('.clip-toggle');
    if (!btn) return;
    btn.classList.toggle('is-active', clipModeOn());
    btn.addEventListener('click', function () {
        const turningOn = !clipModeOn();
        localStorage.setItem('clipMode', turningOn ? '1' : '0');
        btn.classList.toggle('is-active', turningOn);
        if (turningOn && clipTrack) {
            openClip(clipTrack);
        } else if (!turningOn) {
            closeClip(true);
        }
    });
});


// Comparação tolerante a acentos/caixa ("GLÓRIA" ≈ "Gloria")
function normalizeText(text) {
    return (text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// Função para buscar dados de streaming de uma API específica
async function fetchStreamingData(apiUrl) {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Erro na requisição da API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Erro ao buscar dados de streaming da API:", error);
    return null; // Retorna null em caso de erro
  }
}

// Função para alterar o tamanho da imagem do iTunes
function changeImageSize(url, size) {
  const parts = url.split("/");
  const filename = parts.pop();
  const newFilename = `${size}${filename.substring(filename.lastIndexOf("."))}`;
  return parts.join("/") + "/" + newFilename;
}

// Busca na API própria (search.php) — é a mesma fonte de capas do albumArt
// do now-playing, então o resultado é consistente com a capa principal.
// Retorna null quando não encontra (o chamador cai para o iTunes).
const getDataFromSearch = async (artist, title, defaultArt, defaultCover) => {
  const text = artist === title ? `${title}` : `${artist} - ${title}`;
  const cacheKey = ('search:' + text).toLowerCase();
  if (cache[cacheKey]) {
      return cache[cacheKey];
  }

  try {
      const response = await fetch(`https://api.twj.es/search.php?query=${encodeURIComponent(text)}`);
      if (!response.ok) return null;
      const data = await response.json();

      if (data.results && data.results.artwork) {
          const results = {
              title,
              artist,
              thumbnail: data.results.artwork,
              art: data.results.artwork,
              cover: data.results.artwork,
              stream_url: data.results.stream_url || "#not-found",
          };
          cache[cacheKey] = results;
          return results;
      }
      return null;
  } catch (error) {
      return null;
  }
};

// Capa de uma música: tenta a API própria primeiro, iTunes como fallback
const getCoverData = async (artist, title, defaultArt, defaultCover) => {
  const fromSearch = await getDataFromSearch(artist, title, defaultArt, defaultCover);
  if (fromSearch) return fromSearch;
  return getDataFromITunes(artist, title, defaultArt, defaultCover);
};

// Função para buscar dados da API do iTunes
const getDataFromITunes = async (artist, title, defaultArt, defaultCover) => {
  let text;
  if (artist === title) {
      text = `${title}`;
  } else {
      // Sem o " - " literal: a busca do iTunes é por palavras-chave e o
      // hífen solto só atrapalha o match
      text = `${artist} ${title}`;
  }
  const cacheKey = text.toLowerCase();
  if (cache[cacheKey]) {
      return cache[cacheKey];
  }

  // media=music/entity=song: sem esse filtro, podcasts com nomes parecidos
  // entravam no match e a capa vinha errada
  const response = await fetch(`https://itunes.apple.com/search?limit=1&media=music&entity=song&term=${encodeURIComponent(text)}`);
  if (response.status === 403) {
      const results = {
          title,
          artist,
          art: defaultArt,
          cover: defaultCover,
          stream_url: "#not-found",
      };
      return results;
  }
  const data = response.ok ? await response.json() : {};
  if (!data.results || data.results.length === 0) {
      const results = {
          title,
          artist,
          art: defaultArt,
          cover: defaultCover,
          stream_url: "#not-found",
      };
      return results;
  }
  const itunes = data.results[0];
  const results = {
      title: title, // Mantive o título original da transmissão
      artist: artist, // Mantive o artista original da transmissão
      thumbnail: itunes.artworkUrl100 || defaultArt,
      art: itunes.artworkUrl100 ? changeImageSize(itunes.artworkUrl100, "600x600") : defaultArt,
      cover: itunes.artworkUrl100 ? changeImageSize(itunes.artworkUrl100, "1500x1500") : defaultCover,
      stream_url: "#not-found",
  };
  cache[cacheKey] = results;
  return results;
};

// AUDIO 


// Variável global para armazenar as músicas
var audio = new Audio(URL_STREAMING);

// Player control
class Player {
    constructor() {
        this.play = function () {
            var playPromise = audio.play();
            if (playPromise !== undefined) {
                // Autoplay bloqueado pelo navegador até a primeira interação:
                // não é um erro, o usuário dá o play manualmente.
                playPromise.catch(function () {});
            }

            var defaultVolume = document.getElementById('volume').value;

            if (typeof (Storage) !== 'undefined') {
                if (localStorage.getItem('volume') !== null) {
                    audio.volume = intToDecimal(localStorage.getItem('volume'));
                } else {
                    audio.volume = intToDecimal(defaultVolume);
                }
            } else {
                audio.volume = intToDecimal(defaultVolume);
            }
            document.getElementById('volIndicator').innerHTML = defaultVolume;
        };

        this.pause = function () {
            audio.pause();
        };
    }
}

function setPlayerIcon(iconClass, label) {
    var botao = document.getElementById('playerButton');
    var bplay = document.getElementById('buttonPlay');
    botao.className = iconClass;
    bplay.firstChild.data = label;
}

// On play, change the button to pause
audio.onplay = function () {
    setPlayerIcon('fa fa-pause', 'PAUSAR');
}

// On pause, change the button to play (a menos que estejamos exibindo o
// spinner de reconexão, que também pausa o áudio momentaneamente)
audio.onpause = function () {
    if (!isIntentionalPause && reconnectAttempts > 0) return;
    setPlayerIcon('fa fa-play', 'PLAY');
}

// Enquanto o áudio estiver em buffer, mostra o spinner girando
audio.addEventListener('waiting', function () {
    if (!audio.paused) setPlayerIcon('fa fa-spinner fa-spin', 'CARREGANDO');
});

// Áudio voltou a fluir de verdade: reseta as tentativas de reconexão e
// habilita o watchdog (a partir daqui uma queda deve reconectar sozinha)
audio.addEventListener('playing', function () {
    isIntentionalPause = false;
    reconnectAttempts = 0;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    setPlayerIcon('fa fa-pause', 'PAUSAR');
});

// Unmute when volume changed
audio.onvolumechange = function () {
    if (audio.volume > 0) {
        audio.muted = false;
    }
}

// Reconexão automática (rede instável) antes de incomodar o usuário com o
// confirm() de "Stream Down" — só aparece se 5 tentativas seguidas falharem.
// Começa true: antes da primeira reprodução real não há o que reconectar
// (ex.: stream fora do ar no carregamento não deve gerar loop nem confirm).
let isIntentionalPause = true;
let reconnectAttempts = 0;
let reconnectTimeout = null;

function handleConnectionDrop() {
    if (isIntentionalPause) return;

    if (reconnectTimeout) clearTimeout(reconnectTimeout);

    if (reconnectAttempts < 5) {
        reconnectAttempts++;
        setPlayerIcon('fa fa-spinner fa-spin', 'RECONECTANDO');
        var delay = reconnectAttempts * 2000;

        reconnectTimeout = setTimeout(function () {
            audio.load();
            var playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(function (e) { console.error('Falha ao reconectar:', e); });
            }
        }, delay);
    } else {
        reconnectAttempts = 0;
        setPlayerIcon('fa fa-play', 'PLAY');

        var confirmacao = confirm('Stream Down / Network Error. \nClick OK to try again.');
        if (confirmacao) {
            window.location.reload();
        }
    }
}

audio.onerror = handleConnectionDrop;
audio.addEventListener('stalled', handleConnectionDrop);

// Fade suave no volume ao dar play/pause, para evitar o "estalo" de áudio
let fadeInterval = null;

function fadeOut(callback) {
    if (fadeInterval) clearInterval(fadeInterval);
    var currentVol = audio.volume;
    var step = currentVol / 15;

    fadeInterval = setInterval(function () {
        currentVol -= step;
        if (currentVol <= 0.05) {
            audio.volume = 0;
            clearInterval(fadeInterval);
            fadeInterval = null;
            if (callback) callback();
        } else {
            audio.volume = currentVol;
        }
    }, 30);
}

function fadeIn() {
    if (fadeInterval) clearInterval(fadeInterval);
    var targetVol = intToDecimal(localStorage.getItem('volume') || document.getElementById('volume').value || 80);
    audio.volume = 0;
    var step = targetVol / 15;

    fadeInterval = setInterval(function () {
        var newVol = audio.volume + step;
        if (newVol >= targetVol) {
            audio.volume = targetVol;
            clearInterval(fadeInterval);
            fadeInterval = null;
        } else {
            audio.volume = newVol;
        }
    }, 30);
}

document.getElementById('volume').oninput = function () {
    audio.volume = intToDecimal(this.value);

    var page = new Page();
    page.changeVolumeIndicator(this.value);
}


// A rádio e um vídeo do YouTube nunca tocam juntos: dar play na rádio
// pausa qualquer embed em reprodução (o caminho inverso — dar play no
// vídeo pausa a rádio — é tratado pelo watcher de mensagens do YouTube)
function pauseYouTubeEmbeds() {
    document.querySelectorAll('iframe[src*="youtube"]').forEach(function (frame) {
        try {
            frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
        } catch (e) {}
    });
}

function togglePlay() {
    if (!audio.paused) {
        isIntentionalPause = true;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        fadeOut(function () {
            audio.pause();
        });
    } else {
        pauseYouTubeEmbeds();
        isIntentionalPause = false;
        fadeIn();
        audio.load();
        audio.play();
    }
}

function volumeUp() {
    var vol = audio.volume;
    if(audio) {
        if(audio.volume >= 0 && audio.volume < 1) {
            audio.volume = (vol + .01).toFixed(2);
        }
    }
}

function volumeDown() {
    var vol = audio.volume;
    if(audio) {
        if(audio.volume >= 0.01 && audio.volume <= 1) {
            audio.volume = (vol - .01).toFixed(2);
        }
    }
}

function mute() {
    if (!audio.muted) {
        document.getElementById('volIndicator').innerHTML = 0;
        document.getElementById('volume').value = 0;
        audio.volume = 0;
        audio.muted = true;
    } else {
        var localVolume = localStorage.getItem('volume');
        document.getElementById('volIndicator').innerHTML = localVolume;
        document.getElementById('volume').value = localVolume;
        audio.volume = intToDecimal(localVolume);
        audio.muted = false;
    }
}

document.addEventListener('keydown', function (event) {
    var key = event.key;
    var slideVolume = document.getElementById('volume');
    var page = new Page();

    switch (key) {
        // Arrow up
        case 'ArrowUp':
            volumeUp();
            slideVolume.value = decimalToInt(audio.volume);
            page.changeVolumeIndicator(decimalToInt(audio.volume));
            break;
        // Arrow down
        case 'ArrowDown':
            volumeDown();
            slideVolume.value = decimalToInt(audio.volume);
            page.changeVolumeIndicator(decimalToInt(audio.volume));
            break;
        // Spacebar (preventDefault evita rolar a página junto)
        case ' ':
        case 'Spacebar':
            event.preventDefault();
            togglePlay();
            break;
        // P
        case 'p':
        case 'P':
            togglePlay();
            break;
        // M
        case 'm':
        case 'M':
            mute();
            break;
        // Numeric keys 0-9
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            var volumeValue = parseInt(key);
            audio.volume = volumeValue / 10;
            slideVolume.value = volumeValue * 10;
            page.changeVolumeIndicator(volumeValue * 10);
            break;
    }
}); 

function intToDecimal(vol) {
    return vol / 100;
}

function decimalToInt(vol) {
    return vol * 100;
}

// Botão de instalar como PWA: só aparece quando o navegador sinaliza que a
// instalação está disponível (manifest + service worker já registrados).
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredInstallPrompt = event;
    var installBtn = document.getElementById('installPwaBtn');
    if (installBtn) installBtn.hidden = false;
});

document.addEventListener('DOMContentLoaded', function () {
    var installBtn = document.getElementById('installPwaBtn');
    if (!installBtn) return;

    installBtn.addEventListener('click', function () {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then(function () {
            deferredInstallPrompt = null;
            installBtn.hidden = true;
        });
    });

    window.addEventListener('appinstalled', function () {
        installBtn.hidden = true;
    });
});
