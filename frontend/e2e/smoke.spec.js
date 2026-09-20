import { test, expect } from '@playwright/test';

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalize = (value = '') => String(value).trim().toLowerCase();

const login = async (page, email, password) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
};

test('auth smoke: user can register and reach dashboard', async ({ page }) => {
    const email = `smoke.${Date.now()}@example.com`;

    await page.goto('/register');
    await page.getByPlaceholder('Your name').fill('Smoke User');
    await page.getByPlaceholder('your@email.com').fill(email);
    await page.getByPlaceholder('Min. 6 characters').fill('Password123!');
    await page.getByPlaceholder('Re-enter password').fill('Password123!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Here's your learning progress")).toBeVisible();
});

test('learn smoke: learner can complete one lesson', async ({ page }) => {
    await login(page, 'learner.e2e@example.com', 'Password123!');

    await page.goto('/learn');
    await expect(page.getByText('Choose a Category')).toBeVisible();

    const lessonsResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/lessons') &&
        response.request().method() === 'GET' &&
        response.status() === 200
    );

    await page.getByTestId('category-uyir').click();
    const lessons = await (await lessonsResponsePromise).json();
    const lesson = Array.isArray(lessons) ? lessons[0] : null;

    expect(lesson).toBeTruthy();
    const options = Array.isArray(lesson?.options) ? lesson.options : [];
    const correctAnswer = String(lesson?.correct_answer ?? '').trim();
    expect(correctAnswer.length).toBeGreaterThan(0);

    await expect(page.getByRole('button', { name: /submit/i }).first()).toBeVisible();

    if (options.length > 0) {
        const optionIndex = options.findIndex((option) => normalize(option) === normalize(correctAnswer));
        expect(optionIndex).toBeGreaterThanOrEqual(0);

        const legacyOption = page.getByTestId(`option-${optionIndex}`);
        if (await legacyOption.count()) {
            await legacyOption.click();
        } else {
            await page.getByRole('button', {
                name: new RegExp(`^\\s*${escapeRegExp(options[optionIndex])}\\s*$`, 'i')
            }).click();
        }
    } else {
        await page.locator('input[type="text"]').first().fill(correctAnswer);
    }

    await page.getByRole('button', { name: /submit/i }).first().click();

    await expect(page.getByRole('heading', { name: /complete!/i })).toBeVisible();
});

test('admin smoke: admin can access analytics and user progress modal', async ({ page }) => {
    await login(page, 'admin.e2e@example.com', 'Admin123!');

    await page.getByRole('link', { name: /Admin/ }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
    await expect(page.getByText('Total Users')).toBeVisible();

    await page.getByRole('button', { name: 'View' }).first().click();
    await expect(page.getByText('User Progress')).toBeVisible();
});
