'use client';

import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { cn } from '../../lib/utils';
import { saveHomeTheme } from '../../hooks/useAppSettings';

const THEME_OPTIONS = [
	{
		icon: Monitor,
		value: 'system',
		label: 'System',
	},
	{
		icon: Sun,
		value: 'light',
		label: 'Light',
	},
	{
		icon: Moon,
		value: 'dark',
		label: 'Dark',
	},
];

export function ToggleTheme() {
	const { theme, setTheme } = useTheme();
	const [isMounted, setIsMounted] = React.useState(false);

	React.useEffect(() => {
		setIsMounted(true);
	}, []);

	if (!isMounted) {
		return <div className="flex h-8 w-24 bg-gray-100 dark:bg-zinc-800 rounded-md animate-pulse" />;
	}

	return (
		<div
			className="bg-gray-100 dark:bg-zinc-800 inline-flex items-center overflow-hidden rounded-md border border-gray-200 dark:border-zinc-700 p-1 gap-1"
			role="radiogroup"
		>
			{THEME_OPTIONS.map((option) => (
				<button
					key={option.value}
					className={cn(
						'relative flex size-7 cursor-pointer items-center justify-center rounded-sm transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
						theme === option.value
							? 'text-gray-900 dark:text-white'
							: 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300',
					)}
					role="radio"
					aria-checked={theme === option.value}
					aria-label={`Switch to ${option.label} theme`}
					onClick={() => { saveHomeTheme(option.value); setTheme(option.value); }}
				>
					{theme === option.value && (
						<motion.div
							layoutId="theme-option"
							transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
							className="absolute inset-0 rounded-sm bg-white dark:bg-zinc-600 shadow-sm"
						/>
					)}
					<span className="relative z-10">
						<option.icon size={14} />
					</span>
				</button>
			))}
		</div>
	);
}
