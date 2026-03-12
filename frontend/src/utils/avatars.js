export const AVATARS = [
    { id: 'avatar-1', icon: '🧑', bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-600 dark:text-blue-400' },
    { id: 'avatar-2', icon: '👩', bg: 'bg-pink-100 dark:bg-pink-900/50', text: 'text-pink-600 dark:text-pink-400' },
    { id: 'avatar-3', icon: '👨‍🦱', bg: 'bg-indigo-100 dark:bg-indigo-900/50', text: 'text-indigo-600 dark:text-indigo-400' },
    { id: 'avatar-4', icon: '👩‍🦰', bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-600 dark:text-orange-400' },
    { id: 'avatar-5', icon: '🧔', bg: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-600 dark:text-emerald-400' },
    { id: 'avatar-6', icon: '👵', bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-600 dark:text-purple-400' },
    { id: 'avatar-7', icon: '🐯', bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-600 dark:text-amber-400' },
    { id: 'avatar-8', icon: '🦉', bg: 'bg-teal-100 dark:bg-teal-900/50', text: 'text-teal-600 dark:text-teal-400' }
];

export const getAvatar = (id) => {
    return AVATARS.find(a => a.id === id) || AVATARS[0];
};
