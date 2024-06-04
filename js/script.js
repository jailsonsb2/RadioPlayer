const RADIO_NAME = 'Bendición Stereo';

// Change Stream URL Here, .
const URL_STREAMING = 'https://sv2.globalhostlive.com/proxy/bendistereo/stream2';

//API URL Now Playing
const API_URL = 'https://twj.es/get_stream_title/?url='+URL_STREAMING

// Visit https://api.vagalume.com.br/docs/ to get your API key
const API_KEY = "18fe07917957c289983464588aabddfb";

let userInteracted = false;
let musicHistory = JSON.parse(localStorage.getItem('musicHistory')) || [];

window.onload = function () {
    var page = new Page;
    page.changeTitlePage();
    page.setVolume();

    var player = new Player();
    player.play();

    getStreamingData();
    // Interval to get streaming data in miliseconds
    setInterval(function () {
        getStreamingData();
    }, 10000);

    var coverArt = document.getElementsByClassName('cover-album')[0];

    coverArt.style.height = coverArt.offsetWidth + 'px';

}

// DOM control
class Page {
    constructor() {
        this.changeTitlePage = function (title = RADIO_NAME) {
            document.title = title;
        };

        this.refreshCurrentSong = function (song, artist) {
            var currentSong = document.getElementById('currentSong');
            var currentArtist = document.getElementById('currentArtist');
    
            if (song !== currentSong.innerHTML) {
                // Animate transition
                currentSong.className = 'animated flipInY text-uppercase';
                currentSong.innerHTML = song;
    
                currentArtist.className = 'animated flipInY text-capitalize';
                currentArtist.innerHTML = artist;
    
                // Refresh modal title
                document.getElementById('lyricsSong').innerHTML = song + ' - ' + artist;
    
                // Remove animation classes
                setTimeout(function () {
                    currentSong.className = 'text-uppercase';
                    currentArtist.className = 'text-capitalize';
                }, 2000);
            }
        };

        this.refreshCover = function (song, artist, artUrl) { // Adiciona parâmetro artUrl
            var coverArt = document.getElementById('currentCoverArt');
            var coverBackground = document.getElementById('bgCover');
    
            // Usa a URL da capa da API, ou uma imagem padrão se não houver
            var urlCoverArt = artUrl || 'img/cover.png';
    
            // Atualiza apenas se a música ou a capa forem diferentes
            if (song !== lastSong.title || artist !== lastSong.artist || urlCoverArt !== lastCoverArt) {
                lastSong = { title: song, artist: artist }; // Atualiza a música anterior
                lastCoverArt = urlCoverArt; // Atualiza a capa anterior
    
                coverArt.style.backgroundImage = 'url(' + urlCoverArt + ')';
                coverArt.className = 'animated bounceInLeft';
    
                coverBackground.style.backgroundImage = 'url(' + urlCoverArt + ')';
    
                setTimeout(function () {
                    coverArt.className = '';
                }, 2000);
            }
        };

        this.refreshHistoric = function (index) {
            var historicSongs = document.getElementById('historicSong').querySelectorAll('.col-md-6');

            if (index >= 0 && index < historicSongs.length && index < musicHistory.length) {
                var historicItem = historicSongs[index];
                var coverElement = historicItem.querySelector('.cover-historic');
                var songElement = historicItem.querySelector('.song');
                var artistElement = historicItem.querySelector('.artist');

                if (coverElement) {
                    coverElement.style.backgroundImage = 'url(' + musicHistory[index].art + ')';
                }
                if (songElement) {
                    songElement.textContent = musicHistory[index].title;
                }
                if (artistElement) {
                    artistElement.textContent = musicHistory[index].artist;
                }
            } else {
                console.error('Índice fora do intervalo válido para histórico de músicas.');
            }
        };
        
        this.changeVolumeIndicator = function (volume) {
            document.getElementById('volIndicator').innerHTML = volume;

            if (typeof (Storage) !== 'undefined') {
                localStorage.setItem('volume', volume);
            }
        };

        this.setVolume = function () {
            if (typeof (Storage) !== 'undefined') {
                var volumeLocalStorage = (!localStorage.getItem('volume')) ? 80 : localStorage.getItem('volume');
                document.getElementById('volume').value = volumeLocalStorage;
                document.getElementById('volIndicator').innerHTML = volumeLocalStorage;
            }
        };

        this.refreshLyric = function (currentSong, currentArtist) {
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState === 4 && this.status === 200) {
                    var data = JSON.parse(this.responseText);

                    var openLyric = document.getElementsByClassName('lyrics')[0];

                    if (data.type === 'exact' || data.type === 'aprox') {
                        var lyric = data.mus[0].text;

                        document.getElementById('lyric').innerHTML = lyric.replace(/\n/g, '<br />');
                        openLyric.style.opacity = "1";
                        openLyric.setAttribute('data-toggle', 'modal');
                    } else {
                        openLyric.style.opacity = "0.3";
                        openLyric.removeAttribute('data-toggle');

                        var modalLyric = document.getElementById('modalLyrics');
                        modalLyric.style.display = "none";
                        modalLyric.setAttribute('aria-hidden', 'true');
                        (document.getElementsByClassName('modal-backdrop')[0]) ? document.getElementsByClassName('modal-backdrop')[0].remove() : '';
                    }
                } else {
                    document.getElementsByClassName('lyrics')[0].style.opacity = "0.3";
                    document.getElementsByClassName('lyrics')[0].removeAttribute('data-toggle');
                }
            };
            xhttp.open('GET', 'https://api.vagalume.com.br/search.php?apikey=' + API_KEY + '&art=' + currentArtist + '&mus=' + currentSong.toLowerCase(), true);
            xhttp.send();
        };
    }
}

let lastSong = { title: '', artist: '' };
let lastCoverArt = '';

function getStreamingData() {
    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            const page = new Page();

            // Atualiza informações da música atual
            page.refreshCurrentSong(data.song, data.artist);

            // Atualiza a capa (passando a URL da capa da API)
            page.refreshCover(data.song, data.artist, data.art); 

            page.refreshLyric(data.song, data.artist);

            // Adiciona a música atual ao histórico (se for diferente da última)
            if (musicHistory.length === 0 || musicHistory[musicHistory.length - 1].title !== data.song) {
                musicHistory.push({ title: data.song, artist: data.artist, art: data.art || '' });
                if (musicHistory.length > 4) {
                    musicHistory.shift();
                }
                localStorage.setItem('musicHistory', JSON.stringify(musicHistory));
            }

            // Atualiza a interface do histórico
            updateHistoryUI();
        })
        .catch(error => console.error('Erro ao buscar dados da API:', error));
}

// Função para atualizar a interface do histórico

function updateHistoryUI() {
    const historicSong = document.getElementById("historicSong");
    historicSong.innerHTML = ""; // Limpa o histórico atual

    // Percorre o histórico em ordem inversa e cria os elementos
    for (let i = musicHistory.length - 2; i >= 0; i--) {
        const songInfo = musicHistory[i];

        const historicItem = document.createElement("article");
        historicItem.classList.add("col-12", "col-md-6");

        const coverElement = document.createElement("div");
        coverElement.classList.add("cover-historic");
        coverElement.style.backgroundImage = `url(${songInfo.art || 'img/cover.png'})`;
        historicItem.appendChild(coverElement);

        const musicInfo = document.createElement('div');
        musicInfo.classList.add("music-info");

        const songElement = document.createElement("div");
        songElement.classList.add("song");
        songElement.textContent = songInfo.title;
        musicInfo.appendChild(songElement);

        const artistElement = document.createElement("div");
        artistElement.classList.add("artist");
        artistElement.textContent = songInfo.artist;
        musicInfo.appendChild(artistElement);
        
        historicItem.appendChild(musicInfo);
        historicSong.appendChild(historicItem);
    }
}
function clearHistory() {
    localStorage.removeItem('musicHistory');
    musicHistory = []; // Limpa o array musicHistory
    updateHistoryUI(); // Atualiza a interface do histórico
  }

//####################################### AUDIO #######################################


// Variável global para armazenar as músicas
var audio = new Audio(URL_STREAMING);

// Player control
class Player {
    constructor() {
        this.play = function () {
            audio.play();

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

// On play, change the button to pause
audio.onplay = function () {
    var botao = document.getElementById('playerButton');
    var bplay = document.getElementById('buttonPlay');
    if (botao.className === 'fa fa-play') {
        botao.className = 'fa fa-pause';
        bplay.firstChild.data = 'PAUSAR';
    }
}

// On pause, change the button to play
audio.onpause = function () {
    var botao = document.getElementById('playerButton');
    var bplay = document.getElementById('buttonPlay');
    if (botao.className === 'fa fa-pause') {
        botao.className = 'fa fa-play';
        bplay.firstChild.data = 'PLAY';
    }
}

// Unmute when volume changed
audio.onvolumechange = function () {
    if (audio.volume > 0) {
        audio.muted = false;
    }
}

audio.onerror = function () {
    var confirmacao = confirm('Stream Down / Network Error. \nClick OK to try again.');

    if (confirmacao) {
        window.location.reload();
    }
}

document.getElementById('volume').oninput = function () {
    audio.volume = intToDecimal(this.value);

    var page = new Page();
    page.changeVolumeIndicator(this.value);
}

function togglePlay() {
    if (!audio.paused) {
        audio.pause();
    } else {
        audio.load();
        audio.play();
    }
    const playerButton = document.getElementById("playerButton");
    if (player.paused) {
        playerButton.classList.remove("fa-pause");
        playerButton.classList.add("fa-play");
    } else {
        playerButton.classList.remove("fa-play");
        playerButton.classList.add("fa-pause");
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
        // Spacebar
        case ' ':
        case 'Spacebar':
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
