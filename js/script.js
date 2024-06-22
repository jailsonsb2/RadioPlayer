const RADIO_NAME = 'Jailson WebRadio';

// SELECT ARTWORK PROVIDER, ITUNES, DEEZER & SPOTIFY  eg : spotify 
var API_SERVICE = 'DEEZER';

// Change Stream URL Here, Supports, ICECAST, ZENO, SHOUTCAST, RADIOJAR and any other stream service.
const URL_STREAMING = 'https://stream.zeno.fm/yn65fsaurfhvv';

//API URL /
const API_URL = 'https://twj.es/radio_info/';

// Visit https://api.vagalume.com.br/docs/ to get your API key
const API_KEY = "18fe07917957c289983464588aabddfb";

let userInteracted = true;

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

        this.refreshHistoric = function (info, n) {
            var $historicDiv = document.querySelectorAll('#historicSong article');
            var $songName = document.querySelectorAll('#historicSong article .music-info .song');
            var $artistName = document.querySelectorAll('#historicSong article .music-info .artist');
          
            // Imagem padrão definida apenas uma vez
            const defaultCoverArt = 'img/cover.png'; 
            let urlCoverArt = defaultCoverArt; // Começa com a imagem padrão
          
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
              if (this.readyState === 4 && this.status === 200) {
                var data = JSON.parse(this.responseText);
                
                // Verifica se as propriedades existem
                if (data && data.results && data.results.artwork) { 
                  urlCoverArt = data.results.artwork;
          
                  // Seleciona o elemento correto
                  var coverHistoric = document.querySelectorAll('#historicSong article .cover-historic')[n];
                  if (coverHistoric) { // Verifica se o elemento existe
                    coverHistoric.style.backgroundImage = 'url(' + urlCoverArt + ')';
                  } else {
                    console.warn("Elemento cover-historic não encontrado para o índice:", n);
                  }
          
                } else {
                  console.warn("Resposta da API inválida ou dados de artwork ausentes:", data);
                  // Mantém a imagem padrão
                }
              }
          
              // Formatando caracteres para UTF-8
              var music = info.song.replace(/&apos;/g, '\'').replace(/&amp;/g, '&');
              var artist = info.artist.replace(/&apos;/g, '\'').replace(/&amp;/g, '&');
          
              $songName[n].innerHTML = music;
              $artistName[n].innerHTML = artist;
          
              // Adiciona classes para animação (se necessário)
              $historicDiv[n].classList.add('animated', 'slideInRight');
          
              setTimeout(function () {
                for (var j = 0; j < 2; j++) {
                  $historicDiv[j].classList.remove('animated', 'slideInRight');
                }
              }, 2000);
            };
          
            // Requisição com timestamp para evitar cache
            xhttp.open('GET', 'https://api.streamafrica.net/new.search?query=' + info.artist + ' ' + info.song + '&service=' + API_SERVICE.toLowerCase());
            xhttp.send();
          };

        this.refreshCover = function (song = '', artist) {
            // Imagem padrão definida apenas uma vez
            const defaultCoverArt = 'img/cover.png'; 
            let urlCoverArt = defaultCoverArt; // Começa com a imagem padrão
          
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
              var coverArt = document.getElementById('currentCoverArt');
              var coverBackground = document.getElementById('bgCover');
          
              // Verifica se a API retornou um resultado válido
              if (this.readyState === 4 && this.status === 200 && this.responseText.trim() !== '') {
                var data = JSON.parse(this.responseText);
          
                // Verifica se as propriedades existem
                if (data && data.results && data.results.artwork) { 
                  urlCoverArt = data.results.artwork; 
                } else {
                  console.warn("Resposta da API inválida ou dados de artwork ausentes:", data);
                  // Mantém a imagem padrão
                }
              } else {
                console.warn("Erro na requisição da API ou resposta vazia.");
                // Mantém a imagem padrão
              }
          
              // Aplica a imagem de capa (sempre, mesmo se for a padrão)
              coverArt.style.backgroundImage = 'url(' + urlCoverArt + ')';
              coverArt.className = 'animated bounceInLeft';
          
              coverBackground.style.backgroundImage = 'url(' + urlCoverArt + ')';
          
              setTimeout(function () {
                coverArt.className = '';
              }, 2000);
          
              if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                  title: song,
                  artist: artist,
                  artwork: [
                    { src: urlCoverArt, sizes: '96x96', type: 'image/png' },
                    { src: urlCoverArt, sizes: '128x128', type: 'image/png' },
                    { src: urlCoverArt, sizes: '192x192', type: 'image/png' },
                    { src: urlCoverArt, sizes: '256x256', type: 'image/png' },
                    { src: urlCoverArt, sizes: '384x384', type: 'image/png' },
                    { src: urlCoverArt, sizes: '512x512', type: 'image/png' }
                  ]
                });
              }
            };
          
            // Requisição com timestamp para evitar cache
            xhttp.open('GET', 'https://api.streamafrica.net/new.search?query=' + artist + ' ' + song + '&service=' + API_SERVICE.toLowerCase());
            xhttp.send();
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

            if(this.response.length === 0) {
                console.log('%cdebug', 'font-size: 22px')
            }

            var data = JSON.parse(this.responseText);

            var page = new Page();

            // Formating characters to UTF-8
            let song = data.currentSong.replace(/&apos;/g, '\'');
            currentSong = song.replace(/&amp;/g, '&');

            let artist = data.currentArtist.replace(/&apos;/g, '\'');
            currentArtist = artist.replace(/&amp;/g, '&');

            // Change the title
            document.title = currentSong + ' - ' + currentArtist + ' | ' + RADIO_NAME;

            if (document.getElementById('currentSong').innerHTML !== song) {
                page.refreshCover(currentSong, currentArtist);
                page.refreshCurrentSong(currentSong, currentArtist);
                page.refreshLyric(currentSong, currentArtist);

                for (var i = 0; i < 4; i++) {
                    page.refreshHistoric(data.songHistory[i], i);
                }
            }
        } 
    };

    var d = new Date();

    // Requisition with timestamp to prevent cache on mobile devices
    xhttp.open('GET', API_URL);
    xhttp.send();
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
            
            togglePlay(); // Adiciona esta linha para atualizar o botão
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
