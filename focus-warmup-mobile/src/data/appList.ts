export interface AppItem {
  id: string;
  name: string;
  icon: string;
  category: 'social' | 'entertainment' | 'gaming' | 'shopping' | 'news' | 'other';
  bundleId?: string; // For iOS app identification
}

export const DISTRACTING_APPS: AppItem[] = [
  // Social Media
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    category: 'social',
    bundleId: 'com.burbn.instagram'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    category: 'social',
    bundleId: 'com.zhiliaoapp.musically'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '📘',
    category: 'social',
    bundleId: 'com.facebook.Facebook'
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: '🐦',
    category: 'social',
    bundleId: 'com.atebits.Tweetie2'
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    icon: '👻',
    category: 'social',
    bundleId: 'com.toyopagroup.picaboo'
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: '🤖',
    category: 'social',
    bundleId: 'com.reddit.Reddit'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    category: 'social',
    bundleId: 'com.linkedin.LinkedIn'
  },

  // Entertainment
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '📺',
    category: 'entertainment',
    bundleId: 'com.google.ios.youtube'
  },
  {
    id: 'netflix',
    name: 'Netflix',
    icon: '🎬',
    category: 'entertainment',
    bundleId: 'com.netflix.Netflix'
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: '🎧',
    category: 'entertainment',
    bundleId: 'com.spotify.client'
  },
  {
    id: 'twitch',
    name: 'Twitch',
    icon: '🎮',
    category: 'entertainment',
    bundleId: 'tv.twitch'
  },
  {
    id: 'disney',
    name: 'Disney+',
    icon: '🏰',
    category: 'entertainment',
    bundleId: 'com.disney.disneyplus'
  },

  // Gaming
  {
    id: 'candycrush',
    name: 'Candy Crush',
    icon: '🍬',
    category: 'gaming',
    bundleId: 'com.king.candycrushsaga'
  },
  {
    id: 'clashofclans',
    name: 'Clash of Clans',
    icon: '⚔️',
    category: 'gaming',
    bundleId: 'com.supercell.clashofclans'
  },
  {
    id: 'pokemongo',
    name: 'Pokémon GO',
    icon: '⚡',
    category: 'gaming',
    bundleId: 'com.nianticlabs.pokemongo'
  },
  {
    id: 'roblox',
    name: 'Roblox',
    icon: '🎲',
    category: 'gaming',
    bundleId: 'com.roblox.client'
  },

  // Shopping
  {
    id: 'amazon',
    name: 'Amazon',
    icon: '📦',
    category: 'shopping',
    bundleId: 'com.amazon.Amazon'
  },
  {
    id: 'ebay',
    name: 'eBay',
    icon: '🏷️',
    category: 'shopping',
    bundleId: 'com.ebay.iphone'
  },
  {
    id: 'etsy',
    name: 'Etsy',
    icon: '🛍️',
    category: 'shopping',
    bundleId: 'com.etsy.etsy'
  },

  // News & Information
  {
    id: 'buzzfeed',
    name: 'BuzzFeed',
    icon: '📰',
    category: 'news',
    bundleId: 'com.buzzfeed.buzzfeed'
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: '📌',
    category: 'news',
    bundleId: 'com.pinterest.Pinterest'
  },
  {
    id: 'quora',
    name: 'Quora',
    icon: '❓',
    category: 'news',
    bundleId: 'com.quora.Quora'
  }
];

export const APP_CATEGORIES = {
  social: 'Social Media',
  entertainment: 'Entertainment',
  gaming: 'Gaming',
  shopping: 'Shopping',
  news: 'News & Info',
  other: 'Other'
};
