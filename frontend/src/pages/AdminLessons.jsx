import { useState, useEffect } from 'react';
import { lessonAPI } from '../services/api';
import LessonFormModal from '../components/LessonFormModal';

export default function AdminLessons() {
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [difficultyFilter, setDifficultyFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadLessons();
    }, [difficultyFilter, categoryFilter]);

    const loadLessons = async () => {
        setLoading(true);
        try {
            const params = {};
            if (difficultyFilter !== 'all') params.difficulty = difficultyFilter;
            if (categoryFilter !== 'all') params.category = categoryFilter;

            const res = await lessonAPI.getAll(params);
            setLessons(res.data);
        } catch (err) {
            console.error('Failed to load lessons:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClick = () => {
        setEditingLesson(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (lesson) => {
        setEditingLesson(lesson);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm('Are you sure you want to delete this lesson?')) return;

        try {
            await lessonAPI.delete(id);
            setLessons(lessons.filter(l => l._id !== id));
        } catch (err) {
            console.error('Failed to delete lesson:', err);
            alert('Error deleting lesson');
        }
    };

    const handleModalSubmit = async (formData) => {
        setIsSaving(true);
        try {
            if (editingLesson) {
                const res = await lessonAPI.update(editingLesson._id, formData);
                setLessons(lessons.map(l => l._id === editingLesson._id ? res.data : l));
            } else {
                const res = await lessonAPI.create(formData);
                setLessons([res.data, ...lessons]); // Add to top of list
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error('Failed to save lesson:', err);
            alert(err.response?.data?.error || 'Error saving lesson');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-gray-200 dark:border-gray-800 pb-4 transition-colors">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 transition-colors">📚 Manage Lessons</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors">Create, edit, and organize learning content</p>
                </div>
                <button onClick={handleCreateClick} className="btn-primary flex items-center gap-2">
                    <span className="text-xl">+</span> Add New Lesson
                </button>
            </div>

            <div className="card mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">Filters:</span>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input-field py-2 px-3 w-48">
                        <option value="all">All Categories</option>
                        <option value="uyir">Uyir Ezhuthukkal</option>
                        <option value="mei">Mei Ezhuthukkal</option>
                        <option value="uyir-mei">Uyir-Mei</option>
                        <option value="grammar">Grammar</option>
                        <option value="sentences">Sentences</option>
                    </select>
                    <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className="input-field py-2 px-3 w-40">
                        <option value="all">All Levels</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                    </select>
                    <span className="ml-auto text-sm text-gray-500">Total: {lessons.length} lessons</span>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-4 border-tamil-500 border-t-transparent rounded-full" />
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-600 dark:text-gray-500 border-b border-gray-200 dark:border-gray-800">
                                    <th className="text-left py-3 px-4 font-semibold">Question</th>
                                    <th className="text-left py-3 px-4 font-semibold min-w-[150px]">Category</th>
                                    <th className="text-center py-3 px-4 font-semibold">Level</th>
                                    <th className="text-center py-3 px-4 font-semibold">Type</th>
                                    <th className="text-center py-3 px-4 font-semibold">Audio</th>
                                    <th className="text-right py-3 px-4 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lessons.map(lesson => (
                                    <tr key={lesson._id} className="border-b border-gray-200 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="py-3 px-4 text-gray-800 dark:text-gray-200 font-tamil max-w-xs truncate">
                                            {lesson.question}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                                            {lesson.category}
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            <span className={`level-${lesson.difficulty.toLowerCase()} text-xs px-2 py-1 rounded-full`}>
                                                {lesson.difficulty}
                                            </span>
                                        </td>
                                        <td className="text-center py-3 px-4 text-gray-600 dark:text-gray-400">
                                            {lesson.type}
                                        </td>
                                        <td className="text-center py-3 px-4">
                                            {lesson.audio_url ? '🔈' : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right flex justify-end gap-2">
                                            <button onClick={() => handleEditClick(lesson)} className="px-3 py-1.5 text-ocean-600 hover:text-ocean-700 dark:text-ocean-400 dark:hover:text-ocean-300 bg-ocean-100 dark:bg-ocean-500/10 rounded-lg transition-colors font-medium">
                                                Edit
                                            </button>
                                            <button onClick={() => handleDeleteClick(lesson._id)} className="px-3 py-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-100 dark:bg-red-500/10 rounded-lg transition-colors font-medium">
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {lessons.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="text-center py-12 text-gray-500">
                                            No lessons match your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <LessonFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleModalSubmit}
                initialData={editingLesson}
            />
        </div>
    );
}
