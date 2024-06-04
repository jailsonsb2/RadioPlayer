const RADIO_NAME = 'Your Radio';

// Change Azuracast Stream URL Here, .
const URL_STREAMING = 'https://azuracp.web-radios.eu/listen/treloparea/stream';

//API URL Azuracast Now Playing
const API_URL = 'https://azuracp.web-radios.eu/api/nowplaying/2';

// Visit https://api.vagalume.com.br/docs/ to get your API key
const API_KEY = "18fe07917957c289983464588aabddfb";

// Variable to control history display: true = display / false = hides
let showHistory = true; 

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

    localStorage.removeItem('musicHistory');
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
        }

        this.refreshCover = async function () {
        
            try {
                const response = await fetch(API_URL);
                if (!response.ok) {
                    throw new Error('Falha ao obter dados da API');
                }
                
                const data = await response.json();
                const nowPlaying = data.now_playing;
        
                const song = nowPlaying.song.title;
                const artist = nowPlaying.song.artist;
                const artwork = nowPlaying.song.art;
        
                var coverArt = document.getElementById('currentCoverArt');
                var coverBackground = document.getElementById('bgCover');
        
                coverArt.style.backgroundImage = 'url(' + artwork + ')';
                coverArt.className = 'animated bounceInLeft';
        
                coverBackground.style.backgroundImage = 'url(' + artwork + ')';
        
                setTimeout(function () {
                    coverArt.className = '';
                }, 2000);
        
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: song,
                        artist: artist,
                        artwork: [{
                            src: artwork,
                            sizes: '96x96',
                            type: 'image/png'
                        }]
                    });
                }
            } catch (error) {
                console.error('Ocorreu um erro:', error);
            }
        }

        this.refreshHistoric = function (songData, index) {
            // Selecione os elementos HTML correspondentes ao histórico de músicas
            var historicSongs = document.getElementById('historicSong').querySelectorAll('.col-md-6');
        
            // Verifica se o índice está dentro do intervalo válido
            if (index >= 0 && index < historicSongs.length) {
                var historicItem = historicSongs[index];
                var coverElement = historicItem.querySelector('.cover-historic');
                var songElement = historicItem.querySelector('.song');
                var artistElement = historicItem.querySelector('.artist');
        
                // Atualize os elementos com os dados da música
                if (coverElement) {
                    coverElement.style.backgroundImage = 'url(' + songData.art + ')';
                }
                if (songElement) {
                    songElement.textContent = songData.title;
                }
                if (artistElement) {
                    artistElement.textContent = songData.artist;
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

function getStreamingData() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            var data = JSON.parse(this.responseText);
            var page = new Page();

            // Extrai as informações relevantes para a música atual
            var currentSong = data.now_playing.song.title;
            var currentArtist = data.now_playing.song.artist;

            // Atualiza o título da página
            document.title = currentSong + ' - ' + currentArtist + ' | ' + RADIO_NAME;

            // Atualiza as informações da música atual
            if (document.getElementById('currentSong').innerHTML !== currentSong) {
                page.refreshCover(currentSong, currentArtist);
                page.refreshCurrentSong(currentSong, currentArtist);
            }

            // Extrai as informações relevantes para o histórico de músicas
            var songHistory = data.song_history;

            // Atualiza o histórico de músicas
            for (var i = 0; i < songHistory.length; i++) {
                var songData = songHistory[i].song;
                page.refreshHistoric(songData, i);
            }
            
            if (showHistory) {
                // Atualizar a interface do histórico
                updateHistoryUI();
        
            }

            
        } 
    };

    // URL da API do AzuraCast
    xhttp.open('GET', API_URL, true);
    xhttp.send();
}

function updateHistoryUI() {
    let historicElement = document.querySelector('.historic');
    if (showHistory) {
      historicElement.classList.remove('hidden'); // Show history
    } else {
      historicElement.classList.add('hidden'); // Hide history
    }
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
