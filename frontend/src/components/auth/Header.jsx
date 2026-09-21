import { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { FaGithub, FaChevronDown } from 'react-icons/fa6';
import { AppLink as Link } from '../../utils/navigation';
import { ToggleTheme } from '../ui/ThemeToggle';

const menuItems = [
    { 
        title: "Project", 
        links: [
            { text: "GitHub", url: "https://github.com/y-exe/discord-token-webclient", isExternal: true, desc: "ソースコードを閲覧" }, 
            { text: "Commitlog", url: "https://github.com/y-exe/discord-token-webclient/commits/main/", isExternal: true, desc: "更新履歴を確認" }
        ] 
    },
    { 
        title: "Resources", 
        links: [
            { text: "Discord.js", url: "https://discord.js.org/", isExternal: true, desc: "公式ドキュメント" }, 
            { text: "Selfbot v13", url: "https://discordjs-self-v13.netlify.app/", isExternal: true, desc: "Selfbot用ドキュメント" }
        ] 
    },
    { 
        title: "Legal", 
        links: [
            { text: "Terms", url: "/terms", isExternal: false, desc: "利用規約" }, 
            { text: "Privacy", url: "/privacy", isExternal: false, desc: "プライバシーポリシー" }
        ] 
    },
];

export default function Header() {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 transition-colors duration-300">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between font-google">
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-2">
                        <Link to="/login" className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">yexe.xyz</Link>
                    </div>
                    <nav className="hidden md:flex items-center gap-1">
                        {menuItems.map((item, i) => (
                            <div key={i} className="relative" onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                                <button className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1 group">
                                    {item.title}
                                    <FaChevronDown size={10} className={`transition-transform duration-200 ${hoveredIndex === i ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                    {hoveredIndex === i && (
                                        <Motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.2 }} className="absolute top-full left-0 w-64 pt-2">
                                            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-xl p-2 overflow-hidden">
                                                {item.links.map((link, j) => (
                                                    link.isExternal ? (
                                                        <a key={j} href={link.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group">
                                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{link.text}</div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{link.desc}</div>
                                                        </a>
                                                    ) : (
                                                        <Link key={j} to={link.url} className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group">
                                                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{link.text}</div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{link.desc}</div>
                                                        </Link>
                                                    )
                                                ))}
                                            </div>
                                        </Motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <ToggleTheme />
                    <a href="https://github.com/y-exe/discord-token-webclient" target="_blank" rel="noopener noreferrer" className="text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"><FaGithub size={24} /></a>
                </div>
            </div>
        </header>
    );
}
