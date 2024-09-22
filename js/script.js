const RADIO_NAME = "Jailson Web Rádio";

// Change Stream URL Here, Supports, ICECAST, ZENO, SHOUTCAST, RADIOJAR and any other stream service.
const URL_STREAMING = "https://stream.zeno.fm/yn65fsaurfhvv";

//API URL /
const API_URL = "https://twj.es/radio_info/?radio_url=" + URL_STREAMING;
const FALLBACK_API_URL = "https://api-v2.streamafrica.net/icyv2?url=" + URL_STREAMING;

// Visit https://api.vagalume.com.br/docs/ to get your API key
const API_KEY = "18fe07917957c289983464588aabddfb";

let userInteracted = true;

// Cache para a API do iTunes
const cache = {};

window.addEventListener("load", () => {
    const page = new Page();
    page.changeTitlePage();
    page.setVolume();

    const player = new Player();
    player.play();

    // Chama a função getStreamingData imediatamente quando a página carrega
    getStreamingData();

    // Define o intervalo para atualizar os dados de streaming a cada 10 segundos
    const streamingInterval = setInterval(getStreamingData, 10000);

    // Ajusta a altura da capa do álbum para ser igual à sua largura
    const coverArt = document.querySelector(".cover-album"); // Use querySelector para selecionar o elemento
    if (coverArt) {
        // Adiciona uma verificação para garantir que o elemento exista
        coverArt.style.height = `${coverArt.offsetWidth}px`;
    } else {
        console.warn("Elemento .cover-album não encontrado.");
    }
});

// DOM control
class Page {
    constructor() {
        this.changeTitlePage = function (title = RADIO_NAME) {
            document.title = title;
        };

        this.refreshCurrentSong = function (song, artist) {
            const currentSong = document.getElementById("currentSong");
            const currentArtist = document.getElementById("currentArtist");
            const lyricsSong = document.getElementById("lyricsSong");

            if (song !== currentSong.textContent || artist !== currentArtist.textContent) {
                // Esmaecer o conteúdo existente (fade-out)
                currentSong.classList.add("fade-out");
                currentArtist.classList.add("fade-out");

                setTimeout(function () {
                    // Atualizar o conteúdo após o fade-out
                    currentSong.textContent = song;
                    currentArtist.textContent = artist;
                    lyricsSong.textContent = song + " - " + artist;

                    // Esmaecer o novo conteúdo (fade-in)
                    currentSong.classList.remove("fade-out");
                    currentSong.classList.add("fade-in");
                    currentArtist.classList.remove("fade-out");
                    currentArtist.classList.add("fade-in");
                }, 500);

                setTimeout(function () {
                    // Remover as classes fade-in após a animação
                    currentSong.classList.remove("fade-in");
                    currentArtist.classList.remove("fade-in");
                }, 1000);
            }
        };

        this.refreshHistoric = async function (info, n) {
            const historicDiv = document.querySelectorAll("#historicSong article")[n];
            const songName = document.querySelectorAll("#historicSong article .music-info .song")[n];
            const artistName = document.querySelectorAll("#historicSong article .music-info .artist")[n];
            const coverHistoric = document.querySelectorAll("#historicSong article .cover-historic")[n];

            const defaultCoverArt = "img/cover.png";

            // Corrigido: verifica se 'song' e 'artist' são objetos antes de acessar 'title'
            const songTitle = typeof info.song === "object" ? info.song.title : info.song;
            const songArtist = typeof info.artist === "object" ? info.artist.title : info.artist;

            songName.innerHTML = songTitle || "Desconhecido"; // Adiciona uma verificação para evitar erros
            artistName.innerHTML = songArtist || "Desconhecido"; // Adiciona uma verificação para evitar erros

            try {
                // Corrigido: passa 'songTitle' e 'songArtist' para getDataFromITunes
                const data = await getDataFromITunes(songArtist, songTitle, defaultCoverArt, defaultCoverArt);
                coverHistoric.style.backgroundImage = "url(" + (data.art || defaultCoverArt) + ")";
            } catch (error) {
                console.log("Erro ao buscar dados da API do iTunes:", error);
                coverHistoric.style.backgroundImage = "url(" + defaultCoverArt + ")";
            }

            historicDiv.classList.add("animated", "slideInRight");
            setTimeout(() => historicDiv.classList.remove("animated", "slideInRight"), 2000);
        };

        this.refreshCover = async function (song = "", artist) {
            const coverArt = document.getElementById("currentCoverArt");
            const coverBackground = document.getElementById("bgCover");
            const defaultCoverArt = "img/cover.png";

            try {
                const data = await getDataFromITunes(artist, song, defaultCoverArt, defaultCoverArt);

                // Aplica a imagem de capa (sempre, mesmo se for a padrão)
                coverArt.style.backgroundImage = "url(" + data.art + ")";
                coverBackground.style.backgroundImage = "url(" + data.cover + ")";

                // Adiciona/remove classes para animação (se necessário)
                coverArt.classList.add("animated", "bounceInLeft");
                setTimeout(() => coverArt.classList.remove("animated", "bounceInLeft"), 2000);

                // Atualiza MediaSession (se suportado)
                if ("mediaSession" in navigator) {
                    const artwork = [
                        { src: data.art, sizes: "96x96", type: "image/png" },
                        { src: data.art, sizes: "128x128", type: "image/png" },
                        { src: data.art, sizes: "192x192", type: "image/png" },
                        { src: data.art, sizes: "256x256", type: "image/png" },
                        { src: data.art, sizes: "384x384", type: "image/png" },
                        { src: data.art, sizes: "512x512", type: "image/png" },
                    ];

                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: song,
                        artist: artist,
                        artwork,
                    });
                }
                // Atualiza a cor de fundo do #bgCover
                coverBackground.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
            } catch (error) {
                console.log("Erro ao buscar dados da API do iTunes:", error);
                // ... (lógica para lidar com o erro)
            }
        };

        this.changeVolumeIndicator = function (volume) {
            document.getElementById("volIndicator").textContent = volume; // Use textContent em vez de innerHTML

            if (typeof Storage !== "undefined") {
                localStorage.setItem("volume", volume);
            }
        };

        this.setVolume = function () {
            if (typeof Storage !== "undefined") {
                const volumeLocalStorage = localStorage.getItem("volume") || 80; // Operador de coalescência nula (??)

                document.getElementById("volume").value = volumeLocalStorage;
                document.getElementById("volIndicator").textContent = volumeLocalStorage;
            }
        };

        this.refreshLyric = async function (currentSong, currentArtist) {
            const openLyric = document.getElementsByClassName("lyrics")[0];
            const modalLyric = document.getElementById("modalLyrics");

            try {
                const response = await fetch("https://api.vagalume.com.br/search.php?apikey=" + API_KEY + "&art=" + currentArtist + "&mus=" + currentSong.toLowerCase());
                const data = await response.json();

                if (data.type === "exact" || data.type === "aprox") {
                    const lyric = data.mus[0].text;

                    //document.getElementById('lyric').textContent = lyric.replace(/\n/g, '<br />'); Use textContent em vez de innerHTML
                    document.getElementById("lyric").innerHTML = lyric.replace(/\n/g, "<br />");
                    openLyric.style.opacity = "1";
                    openLyric.setAttribute("data-toggle", "modal");

                    // Esconde o modal caso esteja visível
                    modalLyric.style.display = "none";
                    modalLyric.setAttribute("aria-hidden", "true");
                    if (document.getElementsByClassName("modal-backdrop")[0]) {
                        document.getElementsByClassName("modal-backdrop")[0].remove();
                    }
                } else {
                    openLyric.style.opacity = "0.3";
                    openLyric.removeAttribute("data-toggle");
                }
            } catch (error) {
                console.log("Erro ao buscar a letra da música:", error);
                openLyric.style.opacity = "0.3";
                openLyric.removeAttribute("data-toggle");
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
      const historyArray = data.song_history || data.history;

      // Extrai título e artista, adaptando-se aos diferentes formatos
      const extractSongArtist = (data) => ({
        song: typeof data.song === 'object' ? data.song.title : data.song,
        artist: typeof data.artist === 'object' ? data.artist.title : data.artist,
      });
      const { song: currentSong, artist: currentArtist } = extractSongArtist(data);

      document.title = `${currentSong} - ${currentArtist} | ${RADIO_NAME}`;

      if (document.getElementById('currentSong').textContent !== currentSong) {
        page.refreshCover(currentSong, currentArtist);
        page.refreshCurrentSong(currentSong, currentArtist);
        page.refreshLyric(currentSong, currentArtist);

        const historicContainer = document.getElementById('historicSong');
        historicContainer.innerHTML = '';

        for (let i = 1; i < historyArray.length; i++) {
          const songInfo = historyArray[i];
          const { song, artist } = extractSongArtist(songInfo);

          const article = document.createElement('article');
          article.classList.add('col-12', 'col-md-6');
          article.innerHTML = `
            <div class="cover-historic" style="background-image: url('img/cover.png');"></div>
            <div class="music-info">
              <p class="song">${song || "Desconhecido"}</p>
              <p class="artist">${artist || "Desconhecido"}</p>
            </div>
          `;
          historicContainer.appendChild(article);
          page.refreshHistoric({ song, artist }, i - 1); 
        }
      }
    }
  } catch (error) {
    console.log("Erro ao buscar dados de streaming:", error);
  }
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

// Função para buscar dados da API do iTunes
const getDataFromITunes = async (artist, title, defaultArt, defaultCover) => {
    let text;
    if (artist === title) {
        text = `${title}`;
    } else {
        text = `${artist} - ${title}`;
    }
    const cacheKey = text.toLowerCase();
    if (cache[cacheKey]) {
        return cache[cacheKey];
    }

    const response = await fetch(`https://itunes.apple.com/search?limit=1&term=${encodeURIComponent(text)}`);
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
            audio.play();

            var defaultVolume = document.getElementById("volume").value;

            if (typeof Storage !== "undefined") {
                if (localStorage.getItem("volume") !== null) {
                    audio.volume = intToDecimal(localStorage.getItem("volume"));
                } else {
                    audio.volume = intToDecimal(defaultVolume);
                }
            } else {
                audio.volume = intToDecimal(defaultVolume);
            }
            document.getElementById("volIndicator").innerHTML = defaultVolume;

            togglePlay(); // Adiciona esta linha para atualizar o botão
        };

        this.pause = function () {
            audio.pause();
        };
    }
}

// On play, change the button to pause
audio.onplay = function () {
    var botao = document.getElementById("playerButton");
    var bplay = document.getElementById("buttonPlay");
    if (botao.className === "fa fa-play") {
        botao.className = "fa fa-pause";
        bplay.firstChild.data = "PAUSAR";
    }
};

// On pause, change the button to play
audio.onpause = function () {
    var botao = document.getElementById("playerButton");
    var bplay = document.getElementById("buttonPlay");
    if (botao.className === "fa fa-pause") {
        botao.className = "fa fa-play";
        bplay.firstChild.data = "PLAY";
    }
};

// Unmute when volume changed
audio.onvolumechange = function () {
    if (audio.volume > 0) {
        audio.muted = false;
    }
};

audio.onerror = function () {
    var confirmacao = confirm("Stream Down / Network Error. \nClick OK to try again.");

    if (confirmacao) {
        window.location.reload();
    }
};

document.getElementById("volume").oninput = function () {
    audio.volume = intToDecimal(this.value);

    var page = new Page();
    page.changeVolumeIndicator(this.value);
};

function togglePlay() {
    const playerButton = document.getElementById("playerButton");
    const isPlaying = playerButton.classList.contains("fa-pause-circle");

    if (isPlaying) {
        playerButton.classList.remove("fa-pause-circle");
        playerButton.classList.add("fa-play-circle");
        playerButton.style.textShadow = "0 0 5px black";
        audio.pause();
    } else {
        playerButton.classList.remove("fa-play-circle");
        playerButton.classList.add("fa-pause-circle");
        playerButton.style.textShadow = "0 0 5px black";
        audio.load();
        audio.play();
    }
}

function volumeUp() {
    var vol = audio.volume;
    if (audio) {
        if (audio.volume >= 0 && audio.volume < 1) {
            audio.volume = (vol + 0.01).toFixed(2);
        }
    }
}

function volumeDown() {
    var vol = audio.volume;
    if (audio) {
        if (audio.volume >= 0.01 && audio.volume <= 1) {
            audio.volume = (vol - 0.01).toFixed(2);
        }
    }
}

function mute() {
    if (!audio.muted) {
        document.getElementById("volIndicator").innerHTML = 0;
        document.getElementById("volume").value = 0;
        audio.volume = 0;
        audio.muted = true;
    } else {
        var localVolume = localStorage.getItem("volume");
        document.getElementById("volIndicator").innerHTML = localVolume;
        document.getElementById("volume").value = localVolume;
        audio.volume = intToDecimal(localVolume);
        audio.muted = false;
    }
}

document.addEventListener("keydown", function (event) {
    var key = event.key;
    var slideVolume = document.getElementById("volume");
    var page = new Page();

    switch (key) {
        // Arrow up
        case "ArrowUp":
            volumeUp();
            slideVolume.value = decimalToInt(audio.volume);
            page.changeVolumeIndicator(decimalToInt(audio.volume));
            break;
        // Arrow down
        case "ArrowDown":
            volumeDown();
            slideVolume.value = decimalToInt(audio.volume);
            page.changeVolumeIndicator(decimalToInt(audio.volume));
            break;
        // Spacebar
        case " ":
        case "Spacebar":
            togglePlay();
            break;
        // P
        case "p":
        case "P":
            togglePlay();
            break;
        // M
        case "m":
        case "M":
            mute();
            break;
        // Numeric keys 0-9
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
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
