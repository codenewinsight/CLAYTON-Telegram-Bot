const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const { DateTime } = require('luxon');
const { HttpsProxyAgent } = require('https-proxy-agent');

const maxThreads = 10; // Put quantity as your wish

class Clayton {
    constructor(accountIndex, proxy, initData) {
        this.accountIndex = accountIndex;
        this.proxy = proxy;
        this.initData = initData;
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Content-Type": "application/json",
            "Origin": "https://tonclayton.fun",
            "Referer": "https://tonclayton.fun/?tgWebAppStartParam=376905749",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        };
        this.proxyIP = null;
    }

    async log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const accountPrefix = `[Account ${this.accountIndex + 1}]`;
        const ipPrefix = this.proxyIP ? `[${this.proxyIP}]` : '[Unknown IP]';
        let logMessage = '';

        switch(type) {
            case 'success':
                logMessage = `${accountPrefix}${ipPrefix} [t.me/scriptsharing ${msg}`.green;
                break;
            case 'error':
                logMessage = `${accountPrefix}${ipPrefix} [t.me/scriptsharing] ${msg}`.red;
                break;
            case 'warning':
                logMessage = `${accountPrefix}${ipPrefix} [t.me/scriptsharing] ${msg}`.yellow;
                break;
            default:
                logMessage = `${accountPrefix}${ipPrefix} [t.me/scriptsharing] ${msg}`.blue;
        }

        console.log(logMessage);
    }

    async checkProxyIP() {
        try {
            const proxyAgent = new HttpsProxyAgent(this.proxy);
            const response = await axios.get('https://api.ipify.org?format=json', { httpsAgent: proxyAgent });
            if (response.status === 200) {
                this.proxyIP = response.data.ip;
                return response.data.ip;
            } else {
                throw new Error(`Cannot check proxy IP. Status code: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Error checking proxy IP: ${error.message}`);
        }
    }

    async makeRequest(url, method, data = {}) {
        const headers = { ...this.headers, "Init-Data": this.initData };
        const proxyAgent = new HttpsProxyAgent(this.proxy);

        try {
            const response = await axios({
                method,
                url,
                data,
                headers,
                httpsAgent: proxyAgent
            });
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async login() {
        return this.makeRequest("https://tonclayton.fun/api/user/auth", 'post');
    }

    async dailyClaim() {
        return this.makeRequest("https://tonclayton.fun/api/user/daily-claim", 'post');
    }

    async getPartnerTasks() {
        return this.makeRequest("https://tonclayton.fun/api/tasks/partner-tasks", 'get');
    }

    async completePartnerTask(taskId) {
        return this.makeRequest("https://tonclayton.fun/api/tasks/complete", 'post', { task_id: taskId });
    }

    async rewardPartnerTask(taskId) {
        return this.makeRequest("https://tonclayton.fun/api/tasks/claim", 'post', { task_id: taskId });
    }

    async handlePartnerTasks() {
        let fetchAttempts = 0;
        const maxAttempts = 5;

        while (fetchAttempts < maxAttempts) {
            fetchAttempts++;
            const tasksResult = await this.getPartnerTasks();

            if (tasksResult.success) {
                const uncompletedTasks = tasksResult.data.filter(task => !task.is_completed && !task.is_claimed);
                for (const task of uncompletedTasks) {
                    let taskAttempts = 0;
                    while (taskAttempts < maxAttempts) {
                        taskAttempts++;
                        const completeResult = await this.completePartnerTask(task.task_id);
                        if (completeResult.success) {
                            const rewardResult = await this.rewardPartnerTask(task.task_id);
                            if (rewardResult.success) {
                                this.log(`Task ${task.task.title} Success. Reward ${task.task.reward_tokens} CL`, 'success');
                                break;
                            }
                        } else {
                            if (taskAttempts < maxAttempts) {
                                await new Promise(resolve => setTimeout(resolve, 5000));
                            }
                        }
                    }
                    if (taskAttempts === maxAttempts) {
                        this.log(`Complete task failed ${task.task.title} after ${maxAttempts} attempts. Skip this task.`, 'error');
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                return;
            } else {
                if (fetchAttempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }

        if (fetchAttempts === maxAttempts) {
            this.log(`Get Partner task list after ${maxAttempts} attempts. Skip.`, 'error');
        }
    }

    async getDailyTasks() {
        return this.makeRequest("https://tonclayton.fun/api/tasks/daily-tasks", 'get');
    }

    async completeDailyTask(taskId) {
        return this.makeRequest("https://tonclayton.fun/api/tasks/complete", 'post', { task_id: taskId });
    }

    async claimDailyTask(taskId) {
        return this.makeRequest("https://tonclayton.fun/api/tasks/claim", 'post', { task_id: taskId });
    }

    async handleDailyTasks() {
        let fetchAttempts = 0;
        const maxAttempts = 5;

        while (fetchAttempts < maxAttempts) {
            fetchAttempts++;
            const tasksResult = await this.getDailyTasks();

            if (tasksResult.success) {
                const uncompletedTasks = tasksResult.data.filter(task => !task.is_completed && !task.is_claimed);
                for (const task of uncompletedTasks) {
                    let taskAttempts = 0;
                    while (taskAttempts < maxAttempts) {
                        taskAttempts++;
                        const completeResult = await this.completeDailyTask(task.task_id);
                        if (completeResult.success) {
                            const claimResult = await this.claimDailyTask(task.task_id);
                            if (claimResult.success) {
                                this.log(`Task ${task.task.title} Success. Reward ${claimResult.data.reward_tokens} CL`, 'success');
                                this.log(`Total CL: ${claimResult.data.total_tokens} | Game Ticket: ${claimResult.data.game_attempts}`, 'info');
                                break;
                            } else {
                                this.log(`Get Game Reward Failed ${task.task.title}: ${claimResult.error || 'Unknow Error'}`, 'error');
                            }
                        } else {
                            if (taskAttempts < maxAttempts) {
                                await new Promise(resolve => setTimeout(resolve, 5000));
                            }
                        }
                    }
                    if (taskAttempts === maxAttempts) {
                        this.log(`Complete task failed ${task.task.title} after ${maxAttempts} attempts. Skip.`, 'error');
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                return;
            } else {
                if (fetchAttempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }

        if (fetchAttempts === maxAttempts) {
            this.log(`Get Daily Task List failed after ${maxAttempts} attempts. Skip.`, 'error');
        }
    }

    async play2048() {
        const startGameResult = await this.makeRequest("https://tonclayton.fun/api/game/start", 'post');
        if (!startGameResult.success || startGameResult.data.message !== "Game started successfully") {
            this.log("Start Game 2048 Failed", 'error');
            return;
        }

        this.log("Game 2048 started Success", 'success');

        const fixedMilestones = [4, 8, 16, 32, 64, 128, 256, 512, 1024];
        const allMilestones = [...fixedMilestones].sort((a, b) => a - b);
        const gameEndTime = Date.now() + 150000;

        for (const milestone of allMilestones) {
            if (Date.now() >= gameEndTime) break;
            
            await new Promise(resolve => setTimeout(resolve, Math.random() * 10000 + 5000));

            const saveGameResult = await this.makeRequest("https://tonclayton.fun/api/game/save-tile", 'post', { maxTile: milestone });
            if (saveGameResult.success && saveGameResult.data.message === "MaxTile saved successfully") {
                this.log(`Reached cell ${milestone}`, 'success');
            }
        }

        const endGameResult = await this.makeRequest("https://tonclayton.fun/api/game/over", 'post', { multiplier: 1 });
        if (endGameResult.success) {
            const reward = endGameResult.data;
            this.log(`Game 2048 completed Success. Reward ${reward.earn} CL & ${reward.xp_earned} XP`, 'success');
        } else {
            this.log(`Game 2048 complete Failed: ${endGameResult.error || 'Unknow Error'}`, 'error');
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    async playStack() {
        const startGameResult = await this.makeRequest("https://tonclayton.fun/api/stack/start-game", 'post');
        if (!startGameResult.success) {
            this.log("Stard Game Stack Failed", 'error');
            return;
        }

        this.log("Game Stack started Success", 'success');

        const gameEndTime = Date.now() + 120000;
        const scores = [10, 20, 30, 40, 50, 60, 70, 80, 90];
        let currentScoreIndex = 0;

        while (Date.now() < gameEndTime && currentScoreIndex < scores.length) {
            const score = scores[currentScoreIndex];

            const updateResult = await this.makeRequest("https://tonclayton.fun/api/stack/update-game", 'post', { score });
            if (updateResult.success) {
                this.log(`Update Stack Points: ${score}`, 'success');
                currentScoreIndex++;
            } else {
                this.log(`Update Stack Points Error: ${updateResult.error || 'Unknow Error'}`, 'error');
            }

            await new Promise(resolve => setTimeout(resolve, Math.random() * 10000 + 5000));
        }

        const finalScore = scores[currentScoreIndex - 1] || 90;

        const endGameResult = await this.makeRequest("https://tonclayton.fun/api/stack/end-game", 'post', { score: finalScore, multiplier: 1 });
        if (endGameResult.success) {
            const reward = endGameResult.data;
            this.log(`Game Stack completed Success. Nhận ${reward.earn} CL và ${reward.xp_earned} XP`, 'success');
        } else {
            this.log(`Complete Game Stack Failed: ${endGameResult.error || 'Unknow Error'}`, 'error');
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    async playGames() {
        while (true) {
            const loginResult = await this.login();
            if (!loginResult.success) {
                this.log("Check ticket Failed", 'error');
                return;
            }

            const tickets = loginResult.data.user.daily_attempts;
            if (tickets <= 0) {
                this.log("Ticket Empty. Stop Game", 'info');
                return;
            }

            this.log(`Remain Ticket: ${tickets}`, 'info');

            if (tickets >= 2) {
                await this.play2048();
                if (tickets > 1) {
                    await this.playStack();
                }
            } else {
                await this.play2048();
            }
        }
    }

    async handleDefaultTasks() {
        let tasksResult;
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            attempts++;
            tasksResult = await this.makeRequest("https://tonclayton.fun/api/tasks/default-tasks", 'get');
            
            if (tasksResult.success) {
                break;
            } else {
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }

        if (!tasksResult.success) {
            this.log(`Get Defaut task list failed after ${maxAttempts} attempts. Skip.`, 'error');
            return;
        }

        const incompleteTasks = tasksResult.data.filter(task => !task.is_completed && task.task_id !== 9);

        for (const task of incompleteTasks) {
            const completeResult = await this.makeRequest("https://tonclayton.fun/api/tasks/complete", 'post', { task_id: task.task_id });
            
            if (!completeResult.success) {
                continue;
            }

            const claimResult = await this.makeRequest("https://tonclayton.fun/api/tasks/claim", 'post', { task_id: task.task_id });
            
            if (claimResult.success) {
                const reward = claimResult.data;
                this.log(`Task ${task.task.title} Success. Reward ${reward.reward_tokens} CL | Balance: ${reward.total_tokens}`, 'success');
            } else {
                this.log(`Get reward failed | Task ${task.task.title}: ${claimResult.error || 'Unknow Error'}`, 'error');
            }

            await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 2000));
        }
    }

    async handleSuperTasks() {
        let SuperTasks;
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            attempts++;
            SuperTasks = await this.makeRequest("https://tonclayton.fun/api/tasks/super-tasks", 'get');
            
            if (SuperTasks.success) {
                break;
            } else {
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }

        if (!SuperTasks.success) {
            this.log(`Get Super Task List Failed after ${maxAttempts} attempts. Skip.`, 'error');
            return;
        }

        const incompleteTasks = SuperTasks.data.filter(task => !task.is_completed);

        for (const task of incompleteTasks) {
            const completeResult = await this.makeRequest("https://tonclayton.fun/api/tasks/complete", 'post', { task_id: task.task_id });
            
            if (!completeResult.success) {
                continue;
            }

            const claimResult = await this.makeRequest("https://tonclayton.fun/api/tasks/claim", 'post', { task_id: task.task_id });
            
            if (claimResult.success) {
                const reward = claimResult.data;
                this.log(`Task ${task.task.title} Success. Reward ${reward.reward_tokens} CL | Balance: ${reward.total_tokens}`, 'success');
            } else {
                this.log(`Get Reward failed | Task ${task.task.title}: ${claimResult.error || 'Unknow Error'}`, 'error');
            }

            await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 2000));
        }
    }

    async processAccount() {
        try {
            await this.checkProxyIP();
        } catch (error) {
            this.log(`Cannot check proxy IP: ${error.message}`, 'warning');
        }

        let loginSuccess = false;
        let loginAttempts = 0;
        let loginResult;

        while (!loginSuccess && loginAttempts < 3) {
            loginAttempts++;
            this.log(`Login..... (Attempts ${loginAttempts})`, 'info');
            loginResult = await this.login();
            if (loginResult.success) {
                loginSuccess = true;
            } else {
                this.log(`Login Failed: ${loginResult.error}`, 'error');
                if (loginAttempts < 3) {
                    this.log('Re-try...', 'info');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }

        if (!loginSuccess) {
            this.log('Login Failed after 3 attempts. Skip this account', 'error');
            return;
        }

        const userInfo = loginResult.data.user;
        this.log(`CL: ${userInfo.tokens} CL | ${userInfo.daily_attempts} Ticket`, 'info');

        if (loginResult.data.dailyReward.can_claim_today) {
            this.log('Request Daily Reward...', 'info');
            const claimResult = await this.dailyClaim();
            if (claimResult.success) {
                this.log('Daily Reward Claim Success!', 'success');
            } else {
                this.log(`Daily Reward Claim Failed: ${claimResult.error || 'Unknow Error'}`, 'error');
            }
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
        if (userInfo.daily_attempts > 0) {
            await this.playGames();
        } else {
            this.log(`Game Ticket Empty`, 'success');
        }
        await this.handleDefaultTasks();
        await this.handlePartnerTasks();
        await this.handleDailyTasks();
        await this.handleSuperTasks();
    }
}

async function main() {
    const dataFile = path.join(__dirname, 'data.txt');
    const data = fs.readFileSync(dataFile, 'utf8')
        .replace(/\r/g, '')
        .split('\n')
        .filter(Boolean);

    const proxyFile = path.join(__dirname, 'proxy.txt');
    const proxies = fs.readFileSync(proxyFile, 'utf8')
        .replace(/\r/g, '')
        .split('\n')
        .filter(Boolean);

    while (true) {
        for (let i = 0; i < data.length; i += maxThreads) {
            const batch = data.slice(i, i + maxThreads);

            const promises = batch.map((initData, indexInBatch) => {
                const accountIndex = i + indexInBatch;
                const proxy = proxies[accountIndex % proxies.length];
                const client = new Clayton(accountIndex, proxy, initData);
                return timeout(client.processAccount(), 10 * 60 * 1000).catch(err => {
                    client.log(`Process Account Failed: ${err.message}`, 'error');
                });
            });

            await Promise.allSettled(promises);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        console.log(`Completed Process All Account, Wait 24 hours to continue`);
        await new Promise(resolve => setTimeout(resolve, 86400 * 1000));
    }
}

function timeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Timeout'));
        }, ms);

        promise.then(value => {
            clearTimeout(timer);
            resolve(value);
        }).catch(err => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
