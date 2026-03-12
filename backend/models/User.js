const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    skill_score: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
    },
    level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Intermediate'
    },
    lessons_completed: {
        type: Number,
        default: 0
    },
    avatarId: {
        type: String,
        default: 'avatar-1'
    },
    current_streak: {
        type: Number,
        default: 0
    },
    longest_streak: {
        type: Number,
        default: 0
    },
    last_activity_date: {
        type: Date
    },
    badges: [{
        id: String,
        name: String,
        icon: String,
        earnedAt: { type: Date, default: Date.now }
    }],
    failed_login_attempts: {
        type: Number,
        default: 0,
        select: false
    },
    lock_until: {
        type: Date,
        select: false
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Determine level from skill score
userSchema.methods.updateLevel = function () {
    if (this.skill_score <= 30) this.level = 'Beginner';
    else if (this.skill_score <= 70) this.level = 'Intermediate';
    else this.level = 'Advanced';
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire to 15 minutes
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    return resetToken;
};

module.exports = mongoose.model('User', userSchema);
