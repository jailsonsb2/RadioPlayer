# HTML5 Icecast/Shoutcast/Zeno Radio Full Page Radio Player with PWA Support

* Current song
* Historic of played songs ( added option to show or hide history song )
* Cover art of the current song ([Deezer API](https://developers.deezer.com/login?redirect=/api))
* Lyrics of the current song ([Vagalume API](https://api.vagalume.com.br/docs/))
* Responsive design
* Now available as a Progressive Web App (PWA) for enhanced user experience!
* Now available Azuracast support

## Demo Screenshots

![Demo Screenshot](https://i.imgur.com/QcbLFzn.jpg)



# Documentation.

Open The [Script.js](https://github.com/jailsonsb2/RadioPlayer-ZenoRadio/blob/main/js/script.js) file and edit the lines Below.

```javascript
// RADIO NAME
const RADIO_NAME = 'Your Radio Name';

// Change Stream URL Zeno Radio Here.
const URL_STREAMING = 'https://stream.zeno.fm/yn65fsaurfhvv';

// You can find the mount point in the Broadcast Settings.
// To generate the Zeno Radio API link from the mount point,
// exclude the '/source' part and append the remaining mount point to the base URL of the API.
// For example, if the mount point is 'yn65fsaurfhvv/source',
// the API link will be 'https://api.zeno.fm/mounts/metadata/subscribe/yn65fsaurfhvv'.

const API_URL = 'https://api.zeno.fm/mounts/metadata/subscribe/yn65fsaurfhvv'

// Variable to control history display: true = display / false = hides
let showHistory = true; 

 ```

 ## Change Logo.

 Open The img folder and add your logo named "cover.png"

 ## Zeno Radio API Now Playing.

To generate the Zeno Radio API link from the mount point,
exclude the '/source' part and append the remaining mount point to the base URL of the API.
You can find the mount point in the Broadcast Settings.
For example, if the mount point is 'yn65fsaurfhvv/source',
the API link will be 'https://api.zeno.fm/mounts/metadata/subscribe/yn65fsaurfhvv'.

![Demo Screenshot](https://i.imgur.com/8F61uyD.jpg)


 ## Installation
Just put the files in your server or use Free Hosting



## Free Hosting

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jailsonsb2/RadioPlayer-ZenoRadio)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/jailsonsb2/RadioPlayer-ZenoRadio)

### Progressive Web App (PWA) Support

Now you can install the Radio Player as a Progressive Web App (PWA) to your device for an enhanced experience! Simply visit the website on a supported browser and follow the prompts to install it.

### Configuring Radio Name and Colors

To configure the name of your radio and the colors used in the Progressive Web App (PWA), you need to edit the `manifest.json` file:

1. Open the `manifest.json` file in your project.
2. Locate the `"name"` field and replace `'Your Radio Name'` with the name of your radio.
3. If desired, you can also customize the `"background_color"` and `"theme_color"` fields to match your radio's branding colors.

Here's an example:

```json
{
  "name": "Your Radio Name",
  "short_name": "Radio Player",
  "start_url": "/index.html",
  "display": "standalone",
  "background_color": "#ffffff",  // Customize this color to match your branding
  "theme_color": "#ffffff",       // Customize this color to match your branding
  "icons": [
    {
      "src": "img/cover.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}

```

## Supported Hosting Types
* Zeno Radio
* Azuracast

## Supported API/Data Sources
* Deezer
* Azuracast

## Keyboard Controls 
* `M` - mute/unmute
* `P` and `space` - play/pause
* `arrow up` and `arrow down` - increase/decrease volume
* `0 to 9` - volume percent


## Feedback

If you have any feedback, please reach out to me at contact@jailson.es


## License

[MIT](https://github.com/gsavio/player-shoutcast-html5/blob/master/LICENSE)

## Credits
* [gsavio/player-shoutcast-html5](https://github.com/gsavio/player-shoutcast-html5)
* [joeyboli/RadioPlayer](https://github.com/joeyboli/RadioPlayer)


