import { FaDiscord } from 'react-icons/fa6';
import { AppLink as Link } from '../../utils/navigation';

export default function Footer({ forceDark = false }) {
  const menuItems = [
    { 
        title: "Project", 
        links: [
            { text: "GitHub", url: "https://github.com/y-exe/discord-token-webclient" }, 
            { text: "Commitlog", url: "https://github.com/y-exe/discord-token-webclient/commits/main/" }
        ] 
    },
    { 
        title: "Resources", 
        links: [
            { text: "Discord.js", url: "https://discord.js.org/" }, 
            { text: "Selfbot v13", url: "https://discordjs-self-v13.netlify.app/" }
        ] 
    },
  ];
  const copyright = `© ${new Date().getFullYear()} yexe. All rights reserved.`;
  const bottomLinks = [
    { text: "Terms", url: "/terms" },
    { text: "Privacy", url: "/privacy" }
  ];

  return (
    <footer className={`w-full py-16 border-t ${forceDark ? 'border-zinc-800 bg-black text-gray-100 dark' : 'border-gray-100 dark:border-zinc-800 bg-white dark:bg-black text-gray-900 dark:text-gray-100'} relative z-10 transition-colors duration-300`}>
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col lg:flex-row justify-between gap-10">
          <div className="max-w-sm text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
              <FaDiscord size={24} className="text-[#5865F2]" />
              <span className={`font-bold text-lg ${forceDark ? 'text-white' : 'text-gray-900 dark:text-white'} font-google tracking-tight`}>Discord Web Token Client</span>
            </div>
            <p className={`text-sm ${forceDark ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'} leading-relaxed font-google`}>
              ブラウザ上で動作する軽量なDiscordクライアント。
              フィルタリングの回避、メッセージ権限付きのプレビュー共有など、柔軟な利用が可能です。
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            {menuItems.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h3 className={`mb-3 text-sm font-bold ${forceDark ? 'text-gray-100' : 'text-gray-900 dark:text-gray-100'} font-google`}>
                  {section.title}
                </h3>
                <ul className={`space-y-2 text-sm ${forceDark ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'} font-google`}>
                  {section.links.map((link, linkIdx) => (
                    <li key={linkIdx} className={`hover:text-black ${forceDark ? 'text-gray-400 hover:text-white' : 'dark:hover:text-white'} transition-colors`}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer">{link.text}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className={`border-t ${forceDark ? 'border-zinc-800 text-gray-400' : 'border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-gray-400'} mt-12 pt-6 flex flex-col md:flex-row justify-between items-center text-xs gap-4 font-google`}>
          <p>{copyright}</p>
          <ul className="flex flex-wrap gap-4">
            {bottomLinks.map((link, linkIdx) => (
              <li key={linkIdx} className={`hover:text-black ${forceDark ? 'hover:text-white' : 'dark:hover:text-white'} transition-colors underline underline-offset-2`}>
                <Link to={link.url}>{link.text}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
