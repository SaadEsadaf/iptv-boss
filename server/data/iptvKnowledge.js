const topics = [
  {
    id: 'what_is_iptv',
    keywords: ['what is iptv', 'how does iptv work', 'iptv explained', 'what is internet tv', 'how streaming works'],
    audience: 'new',
    summary: 'IPTV (Internet Protocol Television) delivers live TV channels over the internet instead of cable or satellite. You get a server URL + username + password (or an M3U link). Install an IPTV player app, enter these credentials, and start watching on any device.',
    steps: [],
    troubleshooting: [],
  },
  {
    id: 'getting_started_credentials',
    keywords: ['how do i start', 'how to use', 'what do i do now', 'i got the email', 'received credentials', 'my credentials', 'login info', 'activation info', 'what is m3u', 'what is xtream'],
    audience: 'new',
    summary: 'You received an email with your IPTV login info. It has: (1) Server URL — the address to connect to, (2) Username, (3) Password. Some providers also give an M3U link (a URL ending in .m3u or .m3u8). Install an IPTV player app (like TiviMate, IPTV Smarters, or VLC), enter these details, and you\'re ready to watch.',
    steps: [
      'Step 1: Install an IPTV player app on your device (TiviMate for Firestick/Android TV, IPTV Smarters for phones/tablets, VLC for PC).',
      'Step 2: Open the app and look for "Add Playlist" or "Login" or "New User".',
      'Step 3: If you have a Username + Password + Server URL → choose "Xtream Codes API" or "Login". Enter all three.',
      'Step 4: If you have an M3U URL → choose "M3U URL" or "Add Playlist" and paste the full URL.',
      'Step 5: The app will load your channels. This takes 10-30 seconds. You\'re done!',
    ],
    troubleshooting: [],
  },
  {
    id: 'tivimate_setup',
    keywords: ['tivimate', 'tivimate how to', 'tivimate setup', 'tivimate add playlist', 'tivimate xtream', 'tivimate m3u', 'tivimate login', 'tivimate not working'],
    audience: 'existing',
    summary: 'TiviMate is the best IPTV player for Firestick and Android TV. Install from the Amazon App Store or Downloader.',
    steps: [
      'Step 1: Install TiviMate from the Amazon App Store (Firestick) or Google Play (Android TV).',
      'Step 2: Open TiviMate. Tap "Add Playlist".',
      'Step 3: Choose your connection type:',
      '  - Xtream Codes API: Select this if you have Username + Password + Server URL. Enter all three fields.',
      '  - M3U URL: Select this if you have a URL ending in .m3u or .m3u8. Paste the full URL.',
      'Step 4: (Optional) Add an EPG (Electronic Program Guide) URL if you have one. Same URL as M3U often works.',
      'Step 5: Tap "Next" and wait for channels to load (10-30 seconds). Tap "Done".',
      'Step 6: To switch between playlists later: Settings → Playlists → tap your playlist → Edit.',
      '',
      'TiviMate Pro features (paid version): Favorites groups, multi-playlist, catch-up, recording, custom channel order.',
      'Get TiviMate Companion app to unlock Premium (one-time payment ~$5-8).',
    ],
    troubleshooting: [
      { error: '401|unauthorized|invalid credentials', solution: 'Go to TiviMate Settings → Playlists → tap your playlist → Edit. Double-check the username, password, and server URL. Copy-paste from your email to avoid typos. Note: username is sometimes case-sensitive.' },
      { error: 'no stream|stream not found|channel not available|failed to open stream', solution: 'Try changing the User-Agent: Settings → Playlists → your playlist → User-Agent → set to "VLC/3.0.18" or "Mozilla/5.0" and save. Also try: Settings → Decoder → switch between Hardware and Software decoding.' },
      { error: 'buffering|freezing|stuttering|lag', solution: '1. Settings → Playlists → your playlist → Buffer Size → set to "Large (5MB)". 2. Settings → Decoder → try Hardware decoding. 3. Use a wired Ethernet connection instead of WiFi. 4. Try a VPN (your ISP may be throttling IPTV traffic). 5. Reduce video quality in player settings.' },
      { error: 'playlist not loaded|cannot load|connection refused|timeout', solution: 'Your server URL may be blocked. Try: 1. Use a VPN. 2. Change DNS to Google (8.8.8.8) or Cloudflare (1.1.1.1). 3. Try on mobile data to check if it\'s an ISP block. 4. Contact support to verify the server is online.' },
      { error: 'epg not loading|no program info|guide empty', solution: 'TiviMate Settings → EPG → EPG Source → make sure it\'s set. If using Xtream Codes, the EPG is usually included. If using M3U, you may need a separate EPG URL. Go to Playlists → your playlist → EPG URL → paste the EPG link from your provider.' },
      { error: 'too many connections|max connections|already watching', solution: 'You\'ve exceeded your plan\'s stream limit. Log out from other devices, or upgrade to a plan with more simultaneous streams. Wait 5 minutes for the server to clear old sessions.' },
      { error: 'subscription expired|account expired|expired', solution: 'Your subscription has ended. Contact support to renew. Do NOT delete the playlist — it will work again once renewed on the server side.' },
    ],
  },
  {
    id: 'iptv_smarters_setup',
    keywords: ['smarters', 'iptv smarters', 'smarters pro', 'smarters app', 'smarters login', 'smarters how to', 'smarters setup', 'smarters xtream', 'smarters m3u'],
    audience: 'existing',
    summary: 'IPTV Smarters Pro works on all devices: phones, tablets, Firestick, Android TV, iOS, Apple TV, and Smart TVs.',
    steps: [
      'Step 1: Install IPTV Smarters Pro from your device\'s app store (Google Play, Apple App Store, Amazon App Store).',
      'Step 2: Open the app. Tap "Login with Xtream Codes API" (recommended — uses your username/password/server).',
      'Step 3: Enter your: Server URL (just the domain/IP, no http://), Username, Password. Tap "Add User".',
      'Step 4: Wait for channels to load. The app organizes content into: Live TV, Movies, Series, TV Catchup.',
      'Step 5: To add an M3U URL instead: tap "Login with M3U URL" → paste the full M3U URL → tap "Add User".',
      '',
      'Alternative: You can also use "Load Your Playlist" or "Remote M3U" options with the same URL.',
      'Settings are under the gear icon: change player, EPG, parental controls, subtitles.',
    ],
    troubleshooting: [
      { error: '401|unauthorized|invalid|failed', solution: 'Double-check the Server URL field: it should be ONLY the domain or IP (e.g. "iptv.example.com" NOT "http://iptv.example.com"). Remove http:// or https:// from the URL. Verify username and password are exactly as in your email.' },
      { error: 'buffering|freezing', solution: 'In the app, go to Settings → Player → select "ExoPlayer" or "VLC". Switch to a different player. Also try: Settings → Network → Buffer Size → set to Large.' },
      { error: 'stuck on loading|channels not loading|no content', solution: 'Close and reopen the app. If that doesn\'t work: go to Settings → "Clear Data" (not Clear Cache) → re-enter your credentials. Also check: your subscription may have expired.' },
    ],
  },
  {
    id: 'ott_navigator_setup',
    keywords: ['ott navigator', 'ott nav', 'navigator', 'ott navigator setup', 'ott navigator how to'],
    audience: 'existing',
    summary: 'OTT Navigator is a powerful alternative to TiviMate on Android devices. Lightweight and fast.',
    steps: [
      'Step 1: Install OTT Navigator from Google Play or Downloader.',
      'Step 2: Open the app. Tap the "+" icon or "Add Playlist".',
      'Step 3: Choose "Xtream Codes" if you have username/password/server, or "M3U URL" if you have a link.',
      'Step 4: Fill in your details and tap "Connect".',
      'Step 5: The app will load channels in groups. Tap "Allow" if it asks for permissions.',
    ],
    troubleshooting: [
      { error: 'failed to connect', solution: 'Check that your server URL is correct. Try adding "http://" before the server URL if it doesn\'t have it. Also check: the server may be offline — contact support.' },
    ],
  },
  {
    id: 'vlc_setup',
    keywords: ['vlc', 'vlc player', 'vlc iptv', 'vlc m3u', 'vlc open network', 'vlc how to', 'vlc stream'],
    audience: 'existing',
    summary: 'VLC is the simplest way to test IPTV on PC, Mac, or phone. No setup needed — just open the M3U URL.',
    steps: [
      'Step 1: Install VLC from videolan.org (PC/Mac) or your app store (phone).',
      'Step 2: Copy your M3U URL from your email (the link ending in .m3u8 or .m3u).',
      'Step 3 (PC/Mac): Open VLC → Media → Open Network Stream → paste the M3U URL → click Play.',
      'Step 3 (phone): Open VLC → Browse → "Add Network Stream" → paste the URL → tap open.',
      'Step 4: The channel list will appear. You can switch channels via the playlist icon.',
      '',
      'Note: VLC does not support EPG (TV guide). It\'s great for testing but not ideal for daily use. Recommended for quick testing only.',
    ],
    troubleshooting: [],
  },
  {
    id: 'gse_setup',
    keywords: ['gse', 'gse smart iptv', 'gse iptv', 'gse player', 'gse smart', 'gse remote url', 'gse m3u'],
    audience: 'existing',
    summary: 'GSE Smart IPTV is the go-to player for iPhone, iPad, and Apple TV users.',
    steps: [
      'Step 1: Install GSE Smart IPTV from the Apple App Store.',
      'Step 2: Open the app. Tap the gear icon (Settings) → "Remote Playlists".',
      'Step 3: Tap "Add Playlist" → enter any name → choose "M3U URL" or "Xtream Codes API".',
      'Step 4: For M3U: paste the full URL. For Xtream: enter the server, username, and password.',
      'Step 5: Go back to the main screen. Tap the playlist name to load channels.',
      '',
      'Important on iOS: If the playlist URL uses HTTP (not HTTPS), you must enable "Allow HTTP" in the app settings: Settings → General → Allow HTTP → turn ON.',
    ],
    troubleshooting: [
      { error: 'no channels|playlist error|load failed', solution: 'On iOS, HTTP URLs are blocked by default. Go to GSE Settings → General → Allow HTTP → enable it. Then reload the playlist. If still failing, make sure the URL is correct and your device has internet access.' },
    ],
  },
  {
    id: 'stbemu_setup',
    keywords: ['stbemu', 'stb emu', 'mag box', 'stalker', 'portal', 'mac address', 'stb setup', 'stbemu portal'],
    audience: 'existing',
    summary: 'STBEMU emulates a MAG set-top box. Used for Portal/Stalker Middleware connections instead of Xtream or M3U.',
    steps: [
      'Step 1: Install STBEMU from Google Play or Downloader.',
      'Step 2: Open the app. Go to Settings (gear icon).',
      'Step 3: Set "Portal URL" to the server address your provider gave you (e.g. http://portal.example.com/c/).',
      'Step 4: Set "MAC Address" — the app auto-generates one. Note it down in case you need to register it.',
      'Step 5: Go back and click "Restart Portal". The app will connect and load channels.',
      '',
      'If your provider requires a specific MAC address: go to Settings → MAC Address → enter the one they gave you. Then restart the portal.',
    ],
    troubleshooting: [
      { error: 'access denied|blocked|mac blocked', solution: 'Your MAC address may not be authorized. Contact your provider with the MAC address shown in STBEMU Settings. They can whitelist it on the server side.' },
      { error: 'portal not found|cannot connect', solution: 'Check the Portal URL is exactly correct — it should end with /c/ or similar. Try adding http:// if missing. Some portals require HTTPS.' },
    ],
  },
  {
    id: 'perfect_player_setup',
    keywords: ['perfect player', 'perfect player setup', 'perfect player iptv', 'perfectplayer'],
    audience: 'existing',
    summary: 'Perfect Player is a lightweight IPTV player for Android. Simple and fast, great for older devices.',
    steps: [
      'Step 1: Install Perfect Player from Google Play or Downloader.',
      'Step 2: Open the app. Go to Settings (gear icon).',
      'Step 3: Go to "Playlists" → "Add Playlist".',
      'Step 4: Enter a name, choose "Xtream Codes" or "M3U URL" as the type, fill in your details.',
      'Step 5: Go back to Settings → "General" → set your "OSD" and "GUI" preferences.',
      'Step 6: Go back to the home screen. The app will load your channels.',
    ],
    troubleshooting: [],
  },
  {
    id: 'ibo_player_setup',
    keywords: ['ibo player', 'ibo', 'ibo player pro', 'ibo player setup'],
    audience: 'existing',
    summary: 'IBO Player Pro is popular for Firestick and Android TV, similar to TiviMate with a modern interface.',
    steps: [
      'Step 1: Install IBO Player Pro from the Amazon App Store or Google Play.',
      'Step 2: Open the app. Tap "Add Playlist".',
      'Step 3: Enter a name for your playlist.',
      'Step 4: Choose "Xtream Codes API" and enter your server URL, username, and password.',
      'Step 5: Or choose "M3U URL" and paste your playlist link.',
      'Step 6: Tap "Connect". The app will load your channels.',
    ],
    troubleshooting: [],
  },
  {
    id: 'firestick_general',
    keywords: ['firestick', 'fire stick', 'amazon fire', 'fire tv', 'how to install on firestick', 'firestick apps', 'firestick setup'],
    audience: 'existing',
    summary: 'Firestick is the most popular IPTV device. The best players are TiviMate (premium), IPTV Smarters (free), and OTT Navigator (lightweight).',
    steps: [
      'To install apps on Firestick:',
      'Step 1: Go to Settings → My Fire TV → Developer Options → enable "Apps from Unknown Sources" and "ADB Debugging".',
      'Step 2: Install "Downloader" from the Amazon App Store.',
      'Step 3: Use Downloader to sideload APK files from URLs, or install directly from the App Store.',
      '',
      'Recommended Firestick settings for IPTV:',
      '- Disable "Data Monitoring" (Settings → Preferences → Data Monitoring → Off)',
      '- Set display to 1080p 60Hz (Settings → Display & Sounds → Display → 1080p 60Hz)',
      '- Use Ethernet adapter instead of WiFi for stable streaming',
      '- Clear cache weekly: Settings → Applications → Manage Installed Apps → [App] → Clear Cache',
    ],
    troubleshooting: [
      { error: 'app not compatible|device not supported', solution: 'Some apps require Android TV OS. Firestick runs Fire OS (modified Android). Use apps optimized for Firestick: TiviMate, IPTV Smarters, OTT Navigator, Perfect Player. Avoid apps that say "for Android TV only".' },
      { error: 'installation blocked|unknown sources', solution: 'Go to Settings → My Fire TV → Developer Options → turn ON "Apps from Unknown Sources". If you don\'t see Developer Options: go to Settings → My Fire TV → About → click "Device Name" 7 times rapidly to unlock developer mode.' },
    ],
  },
  {
    id: 'android_tv_general',
    keywords: ['android tv', 'android tv box', 'nvidia shield', 'shield tv', 'shield', 'xiaomi mi box', 'mi box', 'mi stick', 'google tv', 'chromecast with google tv'],
    audience: 'existing',
    summary: 'Android TV / Google TV devices run the full Android TV OS. Best players: TiviMate, IPTV Smarters, OTT Navigator.',
    steps: [
      'Step 1: Install any IPTV player from Google Play.',
      'Step 2: Recommended: TiviMate (best for live TV), IPTV Smarters (all-in-one), OTT Navigator (lightweight).',
      'Step 3: Open the app, add your playlist using Xtream Codes API or M3U URL (see the app-specific guides).',
      '',
      'NVIDIA Shield users: Enable "Match Frame Rate" in player settings for smooth 4K playback. Go to Shield Settings → Display & Sound → Match Frame Rate → enable.',
    ],
    troubleshooting: [],
  },
  {
    id: 'ios_apple_tv',
    keywords: ['iphone', 'ipad', 'apple tv', 'ios', 'ios iptv', 'apple tv iptv', 'iphone iptv', 'ipad iptv'],
    audience: 'existing',
    summary: 'Best IPTV players for Apple devices: GSE Smart IPTV (iPhone/iPad/Apple TV), IPTV Smarters (iPhone/iPad), and iSTB (Apple TV).',
    steps: [
      'For iPhone/iPad: Install GSE Smart IPTV or IPTV Smarters from the App Store.',
      'For Apple TV: Install GSE Smart IPTV or iSTB from the App Store.',
      'Important: HTTP URLs are blocked on iOS by default. Enable "Allow HTTP" in the app settings if your playlist uses HTTP.',
      'Setup: Open the app, use Remote Playlists → add with your M3U URL or Xtream Codes.',
    ],
    troubleshooting: [
      { error: 'http blocked|cannot load http', solution: 'iOS blocks HTTP connections by default. In your IPTV app settings, look for "Allow HTTP" or "Insecure Connections" and enable it. Or ask your provider for an HTTPS version of the playlist.' },
    ],
  },
  {
    id: 'smart_tv',
    keywords: ['smart tv', 'samsung tv', 'lg tv', 'sony tv', 'smart tv app', 'tv iptv', 'tv app'],
    audience: 'existing',
    summary: 'Smart TVs can run IPTV via dedicated apps (LG: SS IPTV, Samsung: Smart IPTV) or by casting from phone.',
    steps: [
      'Samsung Tizen: Install "Smart IPTV" or "IPTV Smarters" from the Samsung App Store (may need to change region for SS IPTV).',
      'LG WebOS: Install "SS IPTV" or "IPTV Smarters" from the LG Content Store.',
      'Alternative: Cast from your phone to the TV using Chromecast or AirPlay.',
      'Alternative: Use a Firestick or Android TV box instead — much better IPTV support than built-in TV apps.',
    ],
    troubleshooting: [
      { error: 'app not available|not in store', solution: 'Smart TV app stores have limited IPTV apps. Best solution: buy a Firestick or Android TV box ($20-50) which has full IPTV support.' },
    ],
  },
  {
    id: 'mag_formuler',
    keywords: ['mag box', 'mag 322', 'mag 254', 'mag 256', 'formuler', 'formuler z', 'formuler z8', 'formuler z10', 'formuler z11', 'stalker', 'my tv online'],
    audience: 'existing',
    summary: 'MAG boxes and Formuler (MyTVOnline) are dedicated IPTV devices. They use Portal/Stalker Middleware, not M3U or Xtream Codes.',
    steps: [
      'MAG Box: Go to Settings → Servers → Portal URL → enter your portal address → Save → Reboot.',
      'MAG Box: Go to Settings → Network → configure IP if using static. Most users can leave on DHCP.',
      'Formuler (MyTVOnline): Open MyTVOnline app → press Menu → Settings → Connection → Portal → enter your portal URL.',
      'Formuler (MyTVOnline 2): Press Menu → "+" (Add Portal) → enter name, portal URL, and MAC address if required.',
      'After reboot/restart, the device connects to the portal and displays channels.',
    ],
    troubleshooting: [
      { error: 'no connection|portal error', solution: 'Verify the portal URL is exact. On MAG boxes, reboot the device after entering the URL. Check network connectivity in Settings → Network. Ensure your MAC address is registered with your provider.' },
    ],
  },
  {
    id: 'buffering_troubleshooting',
    keywords: ['buffering', 'freezing', 'stuttering', 'lag', 'keeps loading', 'slow', 'stop', 'pauses', 'freeze', 'buffering fix'],
    audience: 'existing',
    summary: 'Buffering is usually caused by network issues, wrong settings, or ISP throttling. Here\'s how to fix it step by step.',
    steps: [
      'Fix 1 — Buffer Size: In your player settings, increase the buffer size to max (e.g. "Large 5MB" in TiviMate, or enable "Caching" in VLC).',
      'Fix 2 — Player/Decoder: Switch between Hardware and Software decoding in your player settings. Try changing the player app entirely.',
      'Fix 3 — Network: Use Ethernet instead of WiFi. If WiFi is the only option, move the router closer or use a WiFi extender. Test speed at fast.com — need at least 25 Mbps for HD, 50 Mbps for 4K.',
      'Fix 4 — VPN: Your ISP may be throttling IPTV traffic. A VPN encrypts your traffic and bypasses this. ExpressVPN, NordVPN, and ProtonVPN all work well.',
      'Fix 5 — DNS: Change to Google DNS (8.8.8.8, 8.8.4.4) or Cloudflare (1.1.1.1) in your router or device settings.',
      'Fix 6 — Device: Old devices struggle with 4K streams. Lower the stream quality or use a more powerful device (NVIDIA Shield, Firestick 4K Max).',
      'Fix 7 — Server: The provider\'s server may be overloaded. Try different channels — if only some buffer, it\'s a server issue. Contact support.',
    ],
    troubleshooting: [],
  },
  {
    id: 'no_stream_error',
    keywords: ['no stream', 'stream not found', 'channel not available', 'failed to open stream', 'cannot play', 'error loading channel', 'channel offline'],
    audience: 'existing',
    summary: 'A "no stream" error on a specific channel usually means the channel source is down. Try other channels first.',
    steps: [
      'Check: Is this happening on all channels or just one? If one: the channel source is temporarily down. Try again later.',
      'If all channels: try changing User-Agent in your player settings to "VLC/3.0.18" or "Mozilla/5.0".',
      'If still all channels: switch between Hardware and Software decoding in player settings.',
      'If still: try a different player app entirely (e.g. switch from TiviMate to IPTV Smarters to test).',
      'If still: your credentials may have expired or the server may be down. Contact support.',
    ],
    troubleshooting: [],
  },
  {
    id: 'epg_troubleshooting',
    keywords: ['epg', 'tv guide', 'program guide', 'no epg', 'epg not loading', 'guide empty', 'no program info', 'schedule empty'],
    audience: 'existing',
    summary: 'EPG (Electronic Program Guide) shows what\'s playing on each channel. Most providers include it with Xtream Codes.',
    steps: [
      'If EPG is empty: Go to your player\'s EPG settings and check the EPG source URL. With Xtream Codes, the EPG is usually auto-loaded.',
      'With M3U: you may need a separate EPG URL. Your provider should supply this. Add it in the EPG settings.',
      'In TiviMate: Settings → EPG → EPG Source → ensure it\'s set. You can also try "Update EPG" manually.',
      'In IPTV Smarters: The EPG is built-in when using Xtream Codes. For M3U, paste the EPG URL in settings.',
      'Note: EPG sometimes takes 5-10 minutes to load after first adding the playlist. Give it time.',
    ],
    troubleshooting: [],
  },
  {
    id: 'expired_subscription',
    keywords: ['expired', 'subscription expired', 'account expired', 'your subscription has ended', 'expired account', 'renew', 'renewal'],
    audience: 'existing',
    summary: 'Your IPTV subscription has ended. You need to renew to continue watching. Contact support or purchase a new plan.',
    steps: [
      'If you see "expired" in your player: your subscription has ended. Contact us to renew.',
      'Do NOT delete your playlist from the player. Once renewed, the server updates your expiry date and the playlist will start working again without re-entering anything.',
      'To renew: let me help you with a new plan. Would you like the same plan or a different one?',
    ],
    troubleshooting: [],
  },
  {
    id: 'vpn_help',
    keywords: ['vpn', 'vpn setup', 'which vpn', 'best vpn', 'vpn for iptv', 'iso blocking', 'isp throttle', 'vpn iptv', 'does vpn help'],
    audience: 'both',
    summary: 'A VPN encrypts your internet traffic and hides IPTV streaming from your ISP. Many ISPs throttle IPTV traffic — a VPN fixes this.',
    steps: [
      'Recommended VPNs for IPTV: ExpressVPN (fastest, $8/mo), NordVPN (good speed, $3.70/mo), ProtonVPN (free tier available, slower).',
      'To set up: Install the VPN app on your device, connect to a server in your country (or a nearby country), then open your IPTV player.',
      'Firestick users: Install the VPN from the Amazon App Store. Some VPNs have Firestick-optimized apps.',
      'Important: You do not need to connect to a server in a specific country for IPTV. Just connect to the fastest server.',
    ],
    troubleshooting: [],
  },
]

function findRelevant(query, visitorState) {
  const lower = query.toLowerCase()
  const audienceFilter = visitorState === 'existing' ? ['existing', 'both'] : ['new', 'both']
  const matches = []

  for (const topic of topics) {
    const kwMatch = topic.keywords.some(kw => lower.includes(kw))
    const audienceMatch = audienceFilter.includes(topic.audience)
    if (kwMatch && audienceMatch) {
      matches.push(topic)
    }
  }

  return matches
}

function buildContext(query, visitorState) {
  const relevant = findRelevant(query, visitorState)
  if (relevant.length === 0) return ''

  let context = '\n\n--- IPTV KNOWLEDGE BASE ---\n'
  for (const topic of relevant) {
    context += `\n[${topic.id}]\n`
    if (visitorState === 'existing') {
      context += topic.summary + '\n'
      for (const step of topic.steps) {
        context += step + '\n'
      }
      for (const t of topic.troubleshooting) {
        for (const error of t.error.split('|')) {
          if (query.toLowerCase().includes(error)) {
            context += `\nError fix for "${error}": ${t.solution}\n`
          }
        }
      }
    } else {
      context += topic.summary + '\n'
      if (topic.steps.length > 0) {
        context += 'Quick steps if needed:\n' + topic.steps.slice(0, 3).join('\n') + '\n'
      }
    }
  }
  context += '\n--- END KNOWLEDGE ---\n'
  return context
}

module.exports = { topics, findRelevant, buildContext }
