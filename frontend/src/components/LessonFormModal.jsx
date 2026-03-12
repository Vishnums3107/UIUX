import { useState, useEffect } from 'react';

export default function LessonFormModal({ isOpen, onClose, onSubmit, initialData }) {
    const isEditMode = !!initialData;

    const defaultFormData = {
        category: 'uyir',
        difficulty: 'Beginner',
        type: 'mcq',
        question: '',
        options: ['', '', '', ''],
        correct_answer: '',
        hint: '',
        explanation: '',
        audio_url: ''
    };

    const [formData, setFormData] = useState(defaultFormData);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Ensure options array always has 4 elements for simplicity
                const opts = [...(initialData.options || [])];
                while (opts.length < 4) opts.push('');
                setFormData({ ...defaultFormData, ...initialData, options: opts.slice(0, 4) });
            } else {
                setFormData(defaultFormData);
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData(prev => ({ ...prev, options: newOptions }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Clean up empty options before submitting
        const cleanedData = {
            ...formData,
            options: formData.options.filter(opt => opt.trim() !== '')
        };
        onSubmit(cleanedData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-800 transition-colors">
                <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center transition-colors">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {isEditMode ? 'Edit Lesson' : 'Add New Lesson'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                            <select name="category" value={formData.category} onChange={handleChange} className="input-field w-full py-2 px-3">
                                <option value="uyir">Uyir Ezhuthukkal</option>
                                <option value="mei">Mei Ezhuthukkal</option>
                                <option value="uyir-mei">Uyir-Mei</option>
                                <option value="grammar">Grammar</option>
                                <option value="sentences">Sentences</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                            <select name="difficulty" value={formData.difficulty} onChange={handleChange} className="input-field w-full py-2 px-3">
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                            <select name="type" value={formData.type} onChange={handleChange} className="input-field w-full py-2 px-3">
                                <option value="mcq">MCQ</option>
                                <option value="text">Text Input</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question (Tamil/English)</label>
                        <textarea required name="question" value={formData.question} onChange={handleChange} rows="2" className="input-field w-full py-2 px-3 font-tamil text-lg" placeholder="e.g., What is the first vowel? (முதல் உயிரெழுத்து எது?)"></textarea>
                    </div>

                    {formData.type === 'mcq' && (
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Options (Fill at least 2)</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {formData.options.map((opt, idx) => (
                                    <input key={idx} type="text" value={opt} onChange={(e) => handleOptionChange(idx, e.target.value)} placeholder={`Option ${idx + 1}`} className="input-field w-full py-2 px-3 font-tamil" required={idx < 2} />
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correct Answer</label>
                        <input required type="text" name="correct_answer" value={formData.correct_answer} onChange={handleChange} className="input-field w-full py-2 px-3 font-tamil" placeholder="Must match one of the options if MCQ" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hint (Optional)</label>
                            <input type="text" name="hint" value={formData.hint} onChange={handleChange} className="input-field w-full py-2 px-3" placeholder="A helpful clue" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Audio URL (Optional)</label>
                            <input type="text" name="audio_url" value={formData.audio_url} onChange={handleChange} className="input-field w-full py-2 px-3" placeholder="/audio/uyir/a.mp3" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Explanation (Optional)</label>
                        <textarea name="explanation" value={formData.explanation} onChange={handleChange} rows="2" className="input-field w-full py-2 px-3" placeholder="Why is this the correct answer?"></textarea>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-800 transition-colors">
                        <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors font-medium">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary px-6 py-2">
                            {isEditMode ? 'Update Lesson' : 'Create Lesson'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
