/* ==========================================================================
   WEATHER WIDGET (OPEN-METEO API)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function() {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=48.0159&longitude=37.8028&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,is_day,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&wind_speed_unit=ms&timezone=auto";

    function getWindDirection(deg) {
        const sectors = ["С", "ССВ", "СВ", "ВСВ", "В", "ВЮВ", "ЮВ", "ЮЮВ", "Ю", "ЮЮЗ", "ЮЗ", "ЗЮЗ", "З", "ЗСЗ", "СЗ", "ССЗ"];
        const index = Math.round((deg % 360) / 22.5);
        return sectors[index % 16];
    }

    function getSpritePos(col, row) {
        const xOrig = 100 + col * 120;
        const yOrig = [108, 235, 362, 492, 618, 745, 872][row];

        const mainX = Math.round(xOrig * 0.9 - 30);
        const mainY = Math.round(yOrig * 0.9 - 26);

        const foreX = Math.round(xOrig * 0.65 - 22);
        const foreY = Math.round(yOrig * 0.65 - 19);

        return {
            posMain: `-${mainX}px -${mainY}px`,
            posForecast: `-${foreX}px -${foreY}px`
        };
    }

    function getWeatherDesc(code, isDay = 1) {
        code = Number(code);

        if (code === 0) {
            const coords = isDay ? getSpritePos(0, 4) : getSpritePos(1, 4);
            return { text: isDay ? "Ясно" : "Ясно, ночь", ...coords };
        }
        if (code === 1 || code === 2) {
            const coords = isDay ? getSpritePos(1, 0) : getSpritePos(2, 0);
            return { text: isDay ? "Облачно с проясн." : "Переменная обл.", ...coords };
        }
        if (code === 3) {
            return { text: "Пасмурно", ...getSpritePos(0, 0) };
        }
        if (code === 45 || code === 48) {
            return { text: "Туман / Мгла", ...getSpritePos(3, 4) };
        }
        if (code >= 51 && code <= 55) {
            return { text: "Моросящий дождь", ...getSpritePos(3, 1) };
        }
        if (code === 61 || code === 63) {
            return { text: "Дождь", ...getSpritePos(3, 0) };
        }
        if (code === 65 || (code >= 80 && code <= 82)) {
            return { text: "Сильный ливень", ...getSpritePos(0, 1) };
        }
        if (code === 71 || code === 77) {
            const coords = isDay ? getSpritePos(1, 3) : getSpritePos(2, 3);
            return { text: "Небольшой снег", ...coords };
        }
        if (code === 73 || code === 75 || code === 85 || code === 86) {
            return { text: "Снегопад", ...getSpritePos(0, 3) };
        }
        if (code >= 95) {
            const coords = isDay ? getSpritePos(4, 2) : getSpritePos(5, 2);
            return { text: "Гроза", ...coords };
        }

        return { text: "Пасмурно", ...getSpritePos(0, 0) };
    }

    function toFahrenheit(celsius) {
        return Math.round((celsius * 9 / 5) + 32);
    }

    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
        })
        .then(data => {
            if (!data || !data.current) return;
            const cur = data.current;
            const code = cur.weathercode !== undefined ? cur.weathercode : cur.weather_code;
            const isDay = cur.is_day !== undefined ? cur.is_day : 1;
            const weather = getWeatherDesc(code, isDay);

            const tempC = Math.round(cur.temperature_2m);
            const tempF = toFahrenheit(cur.temperature_2m);

            const tempCEl = document.getElementById("w-temp-c");
            const tempFEl = document.getElementById("w-temp-f");
            const descEl = document.getElementById("w-desc");
            const iconEl = document.getElementById("w-icon");

            if (tempCEl) tempCEl.innerText = (tempC > 0 ? "+" : "") + tempC;
            if (tempFEl) tempFEl.innerText = (tempF > 0 ? "+" : "") + tempF;
            if (descEl) descEl.innerText = weather.text;
            if (iconEl) iconEl.style.backgroundPosition = weather.posMain;

            const windEl = document.getElementById("w-wind");
            const windIcon = document.getElementById("w-wind-icon");
            if (windEl && cur.wind_direction_10m !== undefined) {
                const windDirStr = getWindDirection(cur.wind_direction_10m);
                windEl.innerText = `${cur.wind_speed_10m} м/с (${windDirStr})`;

                if (windIcon) {
                    windIcon.style.transform = `rotate(${cur.wind_direction_10m}deg)`;
                    windIcon.title = `Направление ветра: ${cur.wind_direction_10m}° (${windDirStr})`;
                }
            }

            const humEl = document.getElementById("w-humidity");
            const pressEl = document.getElementById("w-pressure");
            if (humEl) humEl.innerText = cur.relative_humidity_2m + "%";
            if (pressEl) {
                const pressureMm = Math.round(cur.surface_pressure * 0.750062);
                pressEl.innerText = pressureMm + " мм рт. ст.";
            }

            const forecastBox = document.getElementById("w-forecast-container");
            if (forecastBox && data.daily && data.daily.time) {
                forecastBox.innerHTML = "";
                const daysOfWeek = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
                const dailyCodes = data.daily.weathercode || data.daily.weather_code;

                for (let i = 1; i <= 3; i++) {
                    if (!data.daily.time[i]) break;

                    const dateParts = data.daily.time[i].split("-");
                    const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                    const dayTitle = (i === 1) ? "Завтра" : daysOfWeek[dateObj.getDay()];
                    const dateFormatted = `${dateParts[2]}.${dateParts[1]}`;
                    
                    const fWeather = getWeatherDesc(dailyCodes[i], 1);

                    const maxC = Math.round(data.daily.temperature_2m_max[i]);
                    const minC = Math.round(data.daily.temperature_2m_min[i]);
                    const maxF = toFahrenheit(data.daily.temperature_2m_max[i]);
                    const minF = toFahrenheit(data.daily.temperature_2m_min[i]);

                    const signMax = maxC > 0 ? "+" : "";
                    const signMin = minC > 0 ? "+" : "";
                    const signMaxF = maxF > 0 ? "+" : "";
                    const signMinF = minF > 0 ? "+" : "";

                    const col = document.createElement("div");
                    col.className = "win-sunken-panel";
                    col.style.cssText = "background: #e4e4e4; padding: 6px 2px; text-align: center; border: 1px solid #808080;";
                    col.innerHTML = `
                        <div style="font-weight: bold; font-size: 11px; color: #000080;">
                            ${dayTitle} <span style="font-size: 9px; color: #555;">(${dateFormatted})</span>
                        </div>
                        <div style="height: 38px; display: flex; align-items: center; justify-content: center; margin: 2px 0;">
                            <div class="w-forecast-icon" style="background-position: ${fWeather.posForecast};"></div>
                        </div>
                        <div style="font-size: 10px; color: #222; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 4px;">
                            ${fWeather.text}
                        </div>
                        <div style="font-size: 11px; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 2px;">
                            <span>${signMax}${maxC}</span><span class="w-unit-mini-c"></span>
                            <span style="font-weight: normal; color: #555; margin: 0 1px;">/</span>
                            <span>${signMin}${minC}</span><span class="w-unit-mini-c"></span>
                        </div>
                        <div style="font-size: 10px; color: #555; display: flex; align-items: center; justify-content: center; gap: 2px; margin-top: 1px;">
                            <span>${signMaxF}${maxF}</span><span class="w-unit-mini-f"></span>
                            <span style="margin: 0 1px;">/</span>
                            <span>${signMinF}${minF}</span><span class="w-unit-mini-f"></span>
                        </div>
                    `;
                    forecastBox.appendChild(col);
                }
            }

            const statusEl = document.getElementById("w-status");
            if (statusEl) {
                const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                statusEl.innerText = `Сводка обновлена в ${time} (Метео-сервер ОК)`;
            }
        })
        .catch(err => {
            console.error("Ошибка:", err);
            const statusEl = document.getElementById("w-status");
            if (statusEl) statusEl.innerText = "Автономный режим (нет связи)";
        });
});


/* ==========================================================================
   GOOGLE TRANSLATE INTEGRATION
   ========================================================================== */

function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'ru',
        includedLanguages: 'ru,en,uk,de,zh-CN',
        autoDisplay: false
    }, 'google_translate_element');
}

function applyGoogleTranslate(langCode) {
    if (!langCode) return;

    const googleCombo = document.querySelector('.goog-te-combo');
    
    if (googleCombo) {
        googleCombo.value = langCode;
        googleCombo.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
        setTimeout(() => applyGoogleTranslate(langCode), 300);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const match = document.cookie.match(/(?:^|; )googtrans=([^;]*)/);
    if (match) {
        const parts = decodeURIComponent(match[1]).split('/');
        const lang = parts[2];
        const customSelect = document.getElementById('custom-language-select');
        if (customSelect && lang) {
            customSelect.value = lang;
        }
    }

    const fixGoogleOffset = () => {
        if (document.body.style.top && document.body.style.top !== '0px') {
            document.body.style.top = '0px';
        }
        if (document.body.style.position === 'relative') {
            document.body.style.position = 'static';
        }
    };

    const observer = new MutationObserver(fixGoogleOffset);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
});


/* ==========================================================================
   SNAKE WIDGET 
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById("snakeCanvasWindow");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const container = canvas.parentElement;

    const gridSize = 16;
    let cols = 0;
    let rows = 0;

    function resizeCanvas() {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        cols = Math.floor(canvas.width / gridSize);
        rows = Math.floor(canvas.height / gridSize);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let snake = [];
    let food = { x: 0, y: 0 };
    let dx = 1;
    let dy = 0;
    
    let isDying = false;
    let deathTimer = 0;
    let blinkState = true;

    function resetGame() {
        isDying = false;
        deathTimer = 0;
        const startX = Math.floor(cols / 2);
        const startY = Math.floor(rows / 2);
        snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY }
        ];
        dx = 1;
        dy = 0;
        spawnFood();
    }

    function spawnFood() {
        let safe = false;
        while (!safe && cols > 0 && rows > 0) {
            food.x = Math.floor(Math.random() * cols);
            food.y = Math.floor(Math.random() * rows);
            safe = true;
            for (let part of snake) {
                if (part.x === food.x && part.y === food.y) {
                    safe = false;
                    break;
                }
            }
        }
    }

    // Подсчёт количества доступных свободных клеток из точки (startX, startY)
    function countFreeSpace(startX, startY) {
        let visited = new Set();
        let queue = [{ x: startX, y: startY }];
        let occupied = new Set(snake.map(p => `${p.x},${p.y}`));
        // Хвост освободится на следующем ходу, если змейка не ест
        const tail = snake[snake.length - 1];
        occupied.delete(`${tail.x},${tail.y}`);

        visited.add(`${startX},${startY}`);
        let count = 0;

        while (queue.length > 0 && count <= snake.length + 2) {
            let curr = queue.shift();
            count++;

            const dirs = [
                { x: 0, y: -1 }, { x: 0, y: 1 },
                { x: -1, y: 0 }, { x: 1, y: 0 }
            ];

            for (let d of dirs) {
                let nx = curr.x + d.x;
                let ny = curr.y + d.y;
                let key = `${nx},${ny}`;

                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows &&
                    !occupied.has(key) && !visited.has(key)) {
                    visited.add(key);
                    queue.push({ x: nx, y: ny });
                }
            }
        }
        return count;
    }

    function autoNavigate() {
        if (cols <= 0 || rows <= 0 || snake.length === 0) return;
        const head = snake[0];
        let possibleDirs = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 }
        ];

        let validDirs = possibleDirs.filter(d => {
            if (d.x === -dx && d.y === -dy) return false;
            let nx = head.x + d.x;
            let ny = head.y + d.y;
            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false;
            for (let i = 0; i < snake.length - 1; i++) {
                if (snake[i].x === nx && snake[i].y === ny) return false;
            }
            return true;
        });

        if (validDirs.length > 0) {
            // До 12 клеток змейка избегает тупиков (выбирает ветку, где поместится её тело)
            if (snake.length < 12) {
                let safeDirs = validDirs.filter(d => {
                    return countFreeSpace(head.x + d.x, head.y + d.y) >= snake.length;
                });
                if (safeDirs.length > 0) {
                    validDirs = safeDirs;
                } else {
                    // Если все ветки тесные — выбираем самую просторную
                    validDirs.sort((a, b) => {
                        return countFreeSpace(head.x + b.x, head.y + b.y) - countFreeSpace(head.x + a.x, head.y + a.y);
                    });
                    dx = validDirs[0].x;
                    dy = validDirs[0].y;
                    return;
                }
            }

            // Идём к еде по кратчайшему пути
            validDirs.sort((a, b) => {
                let distA = Math.abs((head.x + a.x) - food.x) + Math.abs((head.y + a.y) - food.y);
                let distB = Math.abs((head.x + b.x) - food.x) + Math.abs((head.y + b.y) - food.y);
                return distA - distB;
            });
            dx = validDirs[0].x;
            dy = validDirs[0].y;
        }
    }

    function update() {
        if (cols <= 0 || rows <= 0) return;

        if (isDying) {
            deathTimer++;
            blinkState = !blinkState;
            if (deathTimer > 25) {
                resetGame();
            }
            return;
        }
                    
        autoNavigate();

        let head = { x: snake[0].x + dx, y: snake[0].y + dy };

        let hitWall = (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows);
        let hitSelf = false;
        
        // Проверяем столкновение с телом (кроме самого кончика хвоста, если не съели еду)
        let willEat = (head.x === food.x && head.y === food.y);
        let checkLimit = willEat ? snake.length : snake.length - 1;

        for (let i = 0; i < checkLimit; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
                hitSelf = true;
                break;
            }
        }

        // Если врезались в стену или в себя (и наступила фаза смерти >= 12, либо безвыходный тупик)
        if (hitWall || hitSelf) {
            isDying = true;
            deathTimer = 0;
            return;
        }

        snake.unshift(head);

        if (willEat) {
            spawnFood();
        } else {
            snake.pop();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (cols <= 0 || rows <= 0) return;

        if (isDying) {
            if (blinkState) {
                ctx.fillStyle = "#ff0000";
                for (let part of snake) {
                    ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 1, gridSize - 1);
                }
            }
            return;
        }

        ctx.fillStyle = "#aa0000";
        ctx.fillRect(food.x * gridSize + 2, food.y * gridSize + 2, gridSize - 4, gridSize - 4);
        ctx.fillStyle = "#ff5555";
        ctx.fillRect(food.x * gridSize + 4, food.y * gridSize + 4, 3, 3);

        for (let i = 0; i < snake.length; i++) {
            let part = snake[i];
            
            ctx.fillStyle = (i === 0) ? "#005500" : "#008000";
            ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 1, gridSize - 1);
            ctx.fillStyle = "#00aa00";
            ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 1, 2);
            ctx.fillRect(part.x * gridSize, part.y * gridSize, 2, gridSize - 1);
        }
    }

    setTimeout(() => {
        resizeCanvas();
        resetGame();
        setInterval(() => {
            update();
            draw();
        }, 130);
    }, 100);
});


/* ==========================================================================
   DUUM RAYCASTER ENGINE
   ========================================================================== */

let doomInterval = null;

/* --- AUDIO ENGINE --- */
const SOUND_PATH = 'resorse/sounds/';
const SOUND_EXT = '.mp3';

const doomAudio = {
    shotPool: [],
    deathSounds: [],
    growlPool: [],
    hurtSound: null,
    itemSound: null,
    biteSound: null,
    
    stepDeckA: null,
    stepDeckB: null,
    stepActiveDeck: 'A',
    stepTimer: null,
    stepDuration: 1.084,

    sequenceTracks: [],
    sequenceDurations: [],
    sequenceIndex: 0,
    isPlaying: false,
    loopTimer: null,
    currentPlayingTrack: null,

    init() {
        this.stepDeckA = new Audio(`${SOUND_PATH}doom_stp${SOUND_EXT}`);
        this.stepDeckB = new Audio(`${SOUND_PATH}doom_stp${SOUND_EXT}`);
        [this.stepDeckA, this.stepDeckB].forEach(a => {
            a.volume = 0.25;
            a.preload = 'auto';
            a.addEventListener('loadedmetadata', () => {
                if (a.duration) this.stepDuration = a.duration;
            });
        });

        for (let i = 0; i < 5; i++) {
            const a = new Audio(`${SOUND_PATH}doom_sht${SOUND_EXT}`);
            a.volume = 0.08;
            this.shotPool.push(a);
        }
        
        this.bossHurtSound = new Audio(`${SOUND_PATH}doom_atk${SOUND_EXT}`);
        this.bossHurtSound.volume = 0.7;
        this.bossHurtSound.preservesPitch = false; 
        if (typeof this.bossHurtSound.webkitPreservesPitch !== 'undefined') {
            this.bossHurtSound.webkitPreservesPitch = false;
        }
        this.bossHurtSound.playbackRate = 0.6;

        const d1 = new Audio(`${SOUND_PATH}doom_dd1${SOUND_EXT}`);
        const d2 = new Audio(`${SOUND_PATH}doom_dd2${SOUND_EXT}`);
        d1.volume = 0.4;
        d2.volume = 0.4;
        this.deathSounds = [d1, d2];

        for (let i = 0; i < 3; i++) {
            const g = new Audio(`${SOUND_PATH}doom_atk${SOUND_EXT}`);
            g.volume = 0.3;
            this.growlPool.push(g);
        }

        this.hurtSound = new Audio(`${SOUND_PATH}doom_oit${SOUND_EXT}`);
        this.hurtSound.volume = 1.0;
        this.itemSound = new Audio(`${SOUND_PATH}doom_it2${SOUND_EXT}`);
        this.itemSound.volume = 0.95;
        this.biteSound = new Audio(`${SOUND_PATH}doom_atk${SOUND_EXT}`);
        this.biteSound.volume = 0.25;
        this.knifeSound = new Audio(`${SOUND_PATH}doom_knf${SOUND_EXT}`);
        this.knifeSound.volume = 0.4;

        const trackMap = [
            'doom_loop1', 'doom_loop1',
            'doom_loop2',
            'doom_loop3', 'doom_loop3', 'doom_loop3', 'doom_loop3',
            'doom_loop4', 'doom_loop4', 'doom_loop4', 'doom_loop4'
        ];

        trackMap.forEach((name, idx) => {
            const audio = new Audio(`${SOUND_PATH}${name}${SOUND_EXT}`);
            audio.volume = 0.3;
            audio.preload = 'auto';
            audio.addEventListener('loadedmetadata', () => {
                this.sequenceDurations[idx] = audio.duration;
            });
            this.sequenceTracks.push(audio);
        });
    },

    playStep() {
        if (!this.isPlaying) return;
        const track = this.sequenceTracks[this.sequenceIndex];
        this.currentPlayingTrack = track;
        track.currentTime = 0;
        track.play().catch(() => {});

        const dur = track.duration || this.sequenceDurations[this.sequenceIndex] || 2.0;
        const delayMs = Math.max(100, Math.floor((dur - 0.035) * 1000));

        this.loopTimer = setTimeout(() => {
            if (!this.isPlaying) return;
            if (this.sequenceIndex < 10) this.sequenceIndex++;
            else this.sequenceIndex = 3;
            this.playStep();
        }, delayMs);
    },

    startMusic() {
        this.stopMusic();
        this.isPlaying = true;
        this.sequenceIndex = 0;
        this.playStep();
    },

    stopMusic() {
        this.isPlaying = false;
        this.stopSteps();
        if (this.loopTimer) {
            clearTimeout(this.loopTimer);
            this.loopTimer = null;
        }
        this.sequenceTracks.forEach(track => {
            track.pause();
            track.currentTime = 0;
        });
        this.currentPlayingTrack = null;
    },

    startSteps() {
        if (this.stepTimer) return;
        this.triggerStepSound();
        const stepIntervalMs = Math.max(150, Math.floor((this.stepDuration - 0.03) * 1000));
        this.stepTimer = setInterval(() => {
            this.triggerStepSound();
        }, stepIntervalMs);
    },

    triggerStepSound() {
        const deck = (this.stepActiveDeck === 'A') ? this.stepDeckA : this.stepDeckB;
        this.stepActiveDeck = (this.stepActiveDeck === 'A') ? 'B' : 'A';
        deck.currentTime = 0;
        deck.play().catch(() => {});
    },

    stopSteps() {
        if (this.stepTimer) {
            clearInterval(this.stepTimer);
            this.stepTimer = null;
        }
        if (this.stepDeckA) { this.stepDeckA.pause(); this.stepDeckA.currentTime = 0; }
        if (this.stepDeckB) { this.stepDeckB.pause(); this.stepDeckB.currentTime = 0; }
    },

    playShot() {
        const available = this.shotPool.find(a => a.paused || a.ended) || this.shotPool[0];
        available.currentTime = 0;
        available.preservesPitch = false;
        if (typeof available.webkitPreservesPitch !== 'undefined') {
            available.webkitPreservesPitch = false;
        }
        available.playbackRate = 0.95 + Math.random() * 0.22; 
        available.play().catch(() => {});
    },

    playMonsterDeath() {
        const randomIndex = Math.floor(Math.random() * this.deathSounds.length);
        const sound = this.deathSounds[randomIndex];
        sound.currentTime = 0;
        sound.play().catch(() => {});
    },

    playGrowl(volume = 0.3) {
        const available = this.growlPool.find(a => a.paused || a.ended) || this.growlPool[0];
        available.volume = Math.max(0.05, Math.min(0.5, volume));
        available.currentTime = 0;
        available.play().catch(() => {});
    },

    playHurt() {
        if (this.hurtSound) {
            this.hurtSound.currentTime = 0;
            this.hurtSound.play().catch(() => {});
        }
    },

    playBossHurt() {
        if (this.bossHurtSound) {
            this.bossHurtSound.currentTime = 0;
            this.bossHurtSound.play().catch(() => {});
        }
    },

    playItem() {
        if (this.itemSound) {
            this.itemSound.currentTime = 0;
            this.itemSound.play().catch(() => {});
        }
    },

    playBite() {
        if (this.biteSound) {
            this.biteSound.currentTime = 0;
            this.biteSound.play().catch(() => {});
        }
    },
    
    playKnife() {
        if (this.knifeSound) {
            this.knifeSound.currentTime = 0;
            this.knifeSound.play().catch(() => {});
        }
    }
};

doomAudio.init();

/* --- TEXTURES & SPRITES --- */
const TEXTURE_PATH = 'resorse/images/textures/walls/';
const wallTextures = {};
for (let i = 1; i <= 10; i++) {
    wallTextures[i] = new Image();
}

wallTextures[1].src = TEXTURE_PATH + 'BRICK_1A.PNG';
wallTextures[2].src = TEXTURE_PATH + 'BRICK_2A.PNG';
wallTextures[3].src = TEXTURE_PATH + 'TECH_1C.PNG';
wallTextures[4].src = TEXTURE_PATH + 'CRATE_1D.PNG';
wallTextures[5].src = TEXTURE_PATH + 'CONSOLE_1B.PNG';
wallTextures[6].src = TEXTURE_PATH + 'BRICK_1B.PNG';
wallTextures[7].src = TEXTURE_PATH + 'BRICK_2B.PNG';
wallTextures[8].src = TEXTURE_PATH + 'CRATE_1С.PNG';
wallTextures[9].src = TEXTURE_PATH + 'TECH_4E.PNG';
wallTextures[10].src = TEXTURE_PATH + 'BRICK_3D.PNG';

const decalImg = new Image();
decalImg.src = 'resorse/images/textures/walls/hole1.png';

const weaponFrames = [];
const frameNames = [
    'LOWBA0.png', 'BLPSE0.png', 'BLPSA0.png', 'BLPSB0.png', 'BLPSC0.png', 'BLPSD0.png',
    'LLPSE0.png', 'LLPSA0.png', 'LLPSB0.png', 'LLPSC0.png', 'LLPSD0.png', 'BLAPB0.png', 'LOWBA0.png'
];

const faceFrames = {};
const faceFileNames = [
    'guy1.png', 'guy2.png', 'guy3.png', 'guy5.png', 'guy6.png', 'guy7.png',
    'guy9.png', 'guy10.png', 'guy11.png', 'guy13.png', 'guy14.png', 'guy15.png',
    'guy17.png', 'guy18.png', 'guy19.png', 'guy21.png', 'guy22.png', 'guy23.png',
    'guy24.png'
];

faceFileNames.forEach(name => {
    let img = new Image();
    img.src = 'resorse/images/textures/guyanim/' + name; 
    faceFrames[name] = img;
});

const monsterFrames = [];
const monsterFrameNames = [
    'CBO2A1.png', 'CBO2B1.png', 'CBO2C1.png', 'CBO2D1.png', 
    'CBO2P1.png', 'CBO2Q1.png', 'CBO2R1.png',               
    'CBO2J0.png', 'CBO2K0.png', 'CBO2L0.png', 'CBO2M0.png', 'CBO2N0.png', 'CBO2O0.png' 
];

monsterFrameNames.forEach(name => {
    let img = new Image();
    img.src = 'resorse/images/textures/monster/' + name;
    monsterFrames.push(img);
});

for (let i = 0; i < 13; i++) {
    let img = new Image();
    let fileName = frameNames[i]; 
    img.src = 'resorse/images/textures/pistol/' + fileName; 
    weaponFrames.push(img);
}

const knifeFrames = [];
const knifeFrameNames = ['KNFSA0.png', 'KNFSB0.png', 'KNFSC0.png', 'KNFSD0.png', 'KNFSE0.png', 'KNFSF0.png'];
knifeFrameNames.forEach(name => {
    let img = new Image();
    img.src = 'resorse/images/textures/hend/' + name;
    knifeFrames.push(img);
});

const knifeSwingFrames = [];
const knifeSwingFrameNames = ['KNFSA0.png', 'KNFLB0.png', 'KNFLC0.png', 'KNFLD0.png', 'KNFLE0.png', 'KNFLC0.png'];
knifeSwingFrameNames.forEach(name => {
    let img = new Image();
    img.src = 'resorse/images/textures/hend/' + name;
    knifeSwingFrames.push(img);
});

const hudWeapons = {
    pistols: new Image(),
    knife: new Image()
};
hudWeapons.pistols.src = 'resorse/images/textures/pistol/BLAPB0.png'; 
hudWeapons.knife.src = 'resorse/images/textures/hend/KNFPA0.png';

const itemSprites = {
    medkit: new Image(),
    ammo: new Image(),
    time: new Image() 
};
itemSprites.medkit.src = 'resorse/images/textures/items/med.png';
itemSprites.ammo.src = 'resorse/images/textures/items/bulets.png';
itemSprites.time.src = 'resorse/images/textures/items/tms.png';

/* --- WINDOW CONTROLS --- */
function openDoomGuide() {
    const win = document.getElementById('doom-guide-window');
    if (win) {
        win.style.display = 'block';
        if (document.activeElement) document.activeElement.blur();
    }
}

function closeDoomGuide(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const win = document.getElementById('doom-guide-window');
    if (win) win.style.display = 'none';
}

function openDoomEasterEgg() {
    const win = document.getElementById('doom-window');
    if (!win) return;
    win.style.display = 'block';
    doomAudio.startMusic();
    startDoomGame();
    if (document.activeElement) {
        document.activeElement.blur();
    }
}

function closeDoomEasterEgg(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const win = document.getElementById('doom-window');
    if (win) win.style.display = 'none';
    doomAudio.stopMusic();
    doomInterval = false; 
}

/* --- MAIN GAME LOOP --- */
function startDoomGame() {
    const canvas = document.getElementById('doomCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; 

    const screenWidth = 720;
    const screenHeight = 460;
    const viewportHeight = 350;
    
    const fov = Math.PI / 3;
    const halfFov = fov / 2;
    const zBuffer = new Array(screenWidth);

    const MAX_LIGHT_DIST = 9;
    const MIN_BRIGHTNESS = 0.01;

    let showMinimap = true;
    let showAllMonsters = false;

    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyM') showMinimap = !showMinimap;
        if (e.code === 'KeyN') showAllMonsters = !showAllMonsters;
    });

    const map = [ 
        [1,1,10,1,6,1,1,1,1,1,10,1,1,1,1,1,1,1,1,10,1,6,1,1],
        [1,0,0,0,0,0,0,1,4,4,8,9,4,4,4,1,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,6,4,0,0,0,0,0,4,4,0,1,1,5,1,1,0,1],
        [1,0,0,0,0,0,0,1,4,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1],
        [6,0,0,0,0,0,0,0,0,0,0,0,0,0,8,1,0,1,0,0,0,1,0,1],
        [1,0,0,0,0,0,0,1,4,0,4,0,4,0,4,1,0,6,0,0,0,1,0,6],
        [1,0,0,0,0,0,0,6,4,4,4,0,4,4,4,1,0,1,1,0,1,1,0,1],
        [1,1,1,0,0,1,1,1,1,1,1,0,1,1,1,1,0,0,0,0,0,0,0,1],
        [1,2,2,0,0,2,2,2,7,2,2,0,2,2,2,2,1,1,1,1,1,6,0,1],
        [1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1,0,0,0,0,0,0,1],
        [1,7,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1,0,1,1,1,1,1,1],
        [1,2,0,0,2,2,0,0,0,0,2,2,0,0,0,2,0,0,1,3,3,9,3,1],
        [1,2,0,0,7,2,0,0,0,0,2,2,0,0,0,2,1,0,1,3,0,0,0,1],
        [1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1,0,3,3,0,3,0,1],
        [1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1,0,0,0,0,5,0,6],
        [1,2,2,2,2,2,0,0,2,2,2,2,2,2,2,2,1,1,6,3,0,3,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,3,0,1],
        [1,0,1,6,1,6,1,1,1,1,1,1,6,1,0,1,1,0,1,3,3,3,0,1],
        [1,0,1,3,3,8,3,3,3,3,3,8,3,1,0,6,1,0,1,1,1,1,0,1],
        [1,0,1,3,0,0,0,0,0,0,0,0,3,1,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,5,0,3,0,0,0,0,3,0,5,1,1,1,1,1,1,1,1,1,0,1],
        [1,0,0,0,0,8,0,0,0,0,8,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,3,0,0,0,0,0,0,0,0,3,1,6,1,1,1,1,0,1,6,1,1],
        [1,1,10,1,6,1,1,1,1,1,10,1,1,1,1,1,1,1,1,10,1,1,1,1]
    ];

    function getRandomFloorTile() {
        let emptyTiles = [];
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[0].length; x++) {
                if (map[y][x] === 0) {
                    emptyTiles.push({ x: x + 0.5, y: y + 0.5 });
                }
            }
        }
        return emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
    }

    function calculateDistanceMap(targetX, targetY) {
        let rows = map.length;
        let cols = map[0].length;
        let dist = Array.from({length: rows}, () => Array(cols).fill(-1));
        
        let startX = Math.floor(targetX);
        let startY = Math.floor(targetY);
        
        if (startY < 0 || startY >= rows || startX < 0 || startX >= cols) return dist;

        let queue = [{x: startX, y: startY}];
        dist[startY][startX] = 0;

        let dx = [0, 0, -1, 1];
        let dy = [-1, 1, 0, 0];

        while(queue.length > 0) {
            let curr = queue.shift();
            let d = dist[curr.y][curr.x];

            for(let i = 0; i < 4; i++) {
                let nx = curr.x + dx[i];
                let ny = curr.y + dy[i];

                if(ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
                    let cell = map[ny][nx];
                    if ((cell === 0 ) && dist[ny][nx] === -1) {
                        dist[ny][nx] = d + 1;
                        queue.push({x: nx, y: ny});
                    }
                }
            }
        }
        return dist;
    }

    function tryMove(newX, newY) {
        let radius = 0.22;

        function isWalkable(x, y) {
            let mapX = Math.floor(x);
            let mapY = Math.floor(y);
            if (mapY < 0 || mapY >= map.length || mapX < 0 || mapX >= map[0].length) return false;
            return map[mapY][mapX] === 0;
        }

        let testX = newX;
        let canX = true;
        let offsetX = (testX > player.x) ? radius : -radius;
        
        if (!isWalkable(testX + offsetX, player.y - radius) || 
            !isWalkable(testX + offsetX, player.y + radius)) {
            canX = false;
        }

        if (canX) {
            for (let en of enemies) {
                if (en.state === 'alive' && Math.hypot(testX - en.x, player.y - en.y) < 0.35) { canX = false; break; }
            }
        }
        if (canX) player.x = testX;

        let testY = newY;
        let canY = true;
        let offsetY = (testY > player.y) ? radius : -radius;

        if (!isWalkable(player.x - radius, testY + offsetY) || 
            !isWalkable(player.x + radius, testY + offsetY)) {
            canY = false;
        }

        if (canY) {
            for (let en of enemies) {
                if (en.state === 'alive' && Math.hypot(player.x - en.x, testY - en.y) < 0.35) { canY = false; break; }
            }
        }
        if (canY) player.y = testY;
    }

    function hasLineOfSight(x0, y0, x1, y1) {
        let dx = x1 - x0;
        let dy = y1 - y0;
        let dist = Math.hypot(dx, dy);
        let steps = Math.ceil(dist / 0.2);
        for (let i = 1; i < steps; i++) {
            let t = i / steps;
            let cx = Math.floor(x0 + dx * t);
            let cy = Math.floor(y0 + dy * t);
            let cell = map[cy] ? map[cy][cx] : 1;
            if (cell > 0) return false;
        }
        return true;
    }

    let player, kills, damageFlash, screenShake, bloodSplats, enemies, items, bullets, decorations, decals, floatingTexts;
    let isDead = false;
    let deathTimer = 0;
    let growlCooldown = 0;
    let backStalkWarning = false;
    let playerInvulnTimer = 0;
    let itemSpawnTimer = 0;

    let hpFlashTimer = 0;
    let ammoFlashTimer = 0;
    let currentKnifeAttackType = 'stab';

    const DEATH_DELAY_FRAMES = 150;
    const ENEMY_COUNT = 22;

    function resetDoomState() {
        player = {
            x: 1.5,
            y: 1.5,
            angle: 0,
            health: 100,
            ammo: 15,
            timeLeft: 30.0,
            currentWeapon: 'pistols',
            weaponSwitchTimer: 0 
        };
        
        floatingTexts = [];
        kills = 0;
        damageFlash = 0;
        screenShake = 0;
        bloodSplats = [];
        bullets = [];
        decals = [];
        isDead = false;
        deathTimer = 0;
        growlCooldown = 0;
        backStalkWarning = false;
        playerInvulnTimer = 0;
        itemSpawnTimer = 0;
        hpFlashTimer = 0;
        ammoFlashTimer = 0;

        enemies = [];
        for (let i = 0; i < ENEMY_COUNT; i++) {
            let tile, dist = 0;
            do {
                tile = getRandomFloorTile();
                dist = Math.hypot(tile.x - player.x, tile.y - player.y);
            } while (dist < 5);

            enemies.push({
                x: tile.x,
                y: tile.y,
                state: 'alive',
                deathTimer: 0,
                attackCooldown: 0,
                awake: false,
                rage: 0,
                hp: 1, 
                isBoss: false, 
                isStriking: false, 
                speedMult: 1.0, 
                sizeMult: 1.0, 
                targetOffsetX: (Math.random() - 0.5) * 1.5, 
                targetOffsetY: (Math.random() - 0.5) * 1.5,
                lostSightTimer: 0,
                wanderTimer: Math.floor(Math.random() * 200),
                wanderTargetX: tile.x,
                wanderTargetY: tile.y
            });
        }

        items = [];
        for (let i = 0; i < 2; i++) {
            let pMed = getRandomFloorTile();
            items.push({ type: 'medkit', x: pMed.x, y: pMed.y });
            let pAmmo = getRandomFloorTile();
            items.push({ type: 'ammo', x: pAmmo.x, y: pAmmo.y });
            let pTime = getRandomFloorTile();
            items.push({ type: 'time', x: pTime.x, y: pTime.y });
        }
    }

    resetDoomState();

    let keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false, ArrowLeft: false, ArrowRight: false, Space: false };
    let gunAnim = 0;
    let bobPhase = 0;
    let gunDropOffset = 0;
    let flash = false;
    let faceAnimTimer = 0;
    let gazeTimer = 0;
    let gazeDirection = 0;

    window.addEventListener('keydown', (e) => {
        let code = e.code === 'Space' ? 'Space' : e.code;
        if (keys.hasOwnProperty(code)) {
            keys[code] = true;
            if (document.getElementById('doom-window').style.display === 'block') {
                e.preventDefault();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        let code = e.code === 'Space' ? 'Space' : e.code;
        if (keys.hasOwnProperty(code)) {
            keys[code] = false;
        }
    });

    if (doomInterval) clearInterval(doomInterval);

    function getLightLevel(distance, isFlash) {
        let factor = 1.0 - Math.pow(distance / MAX_LIGHT_DIST, 1.6);
        if (factor < MIN_BRIGHTNESS) factor = MIN_BRIGHTNESS;

        if (isFlash) {
            let flashPower = Math.max(0, 0.6 - (distance * 0.1)); 
            factor += flashPower;
        }

        if (factor > 2.5) factor = 2.5;
        factor = Math.floor(factor / 0.040) * 0.040;
        return factor;
    }

    function spawnBlood() {
        for (let i = 0; i < 28; i++) {
            bloodSplats.push({
                x: screenWidth / 2 + (Math.random() - 0.5) * 140,
                y: viewportHeight / 2 + (Math.random() - 0.5) * 80,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.5) * 14 - 3,
                size: Math.random() * 7 + 3,
                life: 10,
                maxLife: 18
            });
        }
    }

    let lastTime = 0;
    let accumulator = 0;
    const TIME_STEP = 1000 / 35;
    doomInterval = true; 

    function gameLoop(timestamp) {
        if (!doomInterval) return; 
        requestAnimationFrame(gameLoop);
        
        if (!lastTime) lastTime = timestamp;
        let deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        if (deltaTime > 250) deltaTime = 250;
        accumulator += deltaTime;

        let updates = 0;
        while (accumulator >= TIME_STEP && updates < 4) {
            accumulator -= TIME_STEP;
            updates++;
            let skipRender = (accumulator >= TIME_STEP && updates < 4);
        
            if (playerInvulnTimer > 0) playerInvulnTimer--;
            if (hpFlashTimer > 0) hpFlashTimer--;
            if (ammoFlashTimer > 0) ammoFlashTimer--;

            if (!isDead) {
                player.timeLeft -= TIME_STEP / 1000;
                if (player.timeLeft <= 0) {
                    player.timeLeft = 0;
                    player.health = 0;
                }
            }

            for (let i = floatingTexts.length - 1; i >= 0; i--) {
                floatingTexts[i].life--;
                if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
            }
            
            for (let i = 0; i < decals.length; i++) {
                if (decals[i].life > 0) decals[i].life--;
            }
            
            itemSpawnTimer++;
            if (itemSpawnTimer > 400) { 
                itemSpawnTimer = 0;
                if (items.filter(i => i.type === 'medkit').length < 3) {
                    let spawnTile = getRandomFloorTile();
                    items.push({ type: 'medkit', x: spawnTile.x, y: spawnTile.y });
                }
                if (items.filter(i => i.type === 'time').length < 1) {
                    let spawnTile = getRandomFloorTile();
                    items.push({ type: 'time', x: spawnTile.x, y: spawnTile.y });
                }
            }

            if (player.health <= 0 && !isDead) {
                isDead = true;
                deathTimer = DEATH_DELAY_FRAMES;
                damageFlash = 25;
                screenShake = 16;
                doomAudio.stopSteps();
                doomAudio.playHurt();
                spawnBlood();
            }

            if (isDead) {
                deathTimer--;
                if (gunDropOffset < 150) gunDropOffset += 5;
                if (deathTimer <= 0) {
                    gunDropOffset = 0;
                    resetDoomState();
                }
            }

            if (!isDead) {
                let moveSpeed = 0.090; 
                if (typeof player.turnFrames === 'undefined') player.turnFrames = 0;

                let isTurning = false;
                let turnDir = 0;

                if (keys['ArrowLeft']) { isTurning = true; turnDir = -1; }
                if (keys['ArrowRight']) { isTurning = true; turnDir = 1; }

                if (isTurning) {
                    player.turnFrames++;
                    let minSens = 0.025;
                    let maxSens = 0.110;
                    let accelTime = 10;
                    let accelFactor = Math.min(player.turnFrames / accelTime, 1.0); 
                    player.angle += turnDir * (minSens + (maxSens - minSens) * accelFactor); 
                } else {
                    player.turnFrames = 0;
                }

                let nextX = player.x;
                let nextY = player.y;
                let moveForward = 0;
                let moveStrafe = 0;

                if (keys['KeyW']) moveForward += 1;
                if (keys['KeyS']) moveForward -= 1;
                if (keys['KeyD']) moveStrafe += 1;
                if (keys['KeyA']) moveStrafe -= 1;

                let isMoving = (moveForward !== 0 || moveStrafe !== 0);

                if (isMoving) {
                    let len = Math.hypot(moveForward, moveStrafe);
                    moveForward /= len;
                    moveStrafe /= len;

                    let dx = Math.cos(player.angle) * moveForward * moveSpeed;
                    let dy = Math.sin(player.angle) * moveForward * moveSpeed;
                    
                    let strafeDx = Math.cos(player.angle + Math.PI / 2) * moveStrafe * moveSpeed;
                    let strafeDy = Math.sin(player.angle + Math.PI / 2) * moveStrafe * moveSpeed;

                    nextX = player.x + dx + strafeDx;
                    nextY = player.y + dy + strafeDy;

                    bobPhase += 0.25;
                    doomAudio.startSteps();
                } else {
                    bobPhase = 0;
                    doomAudio.stopSteps();
                }

                const radius = 0.22;
                let targetX = player.x + (nextX - player.x);
                let checkX = targetX + (targetX > player.x ? radius : -radius);
                let mapCellX = map[Math.floor(player.y)][Math.floor(checkX)];
                let canX = (mapCellX === 0);

                if (canX) {
                    for (let en of enemies) {
                        if (en.state === 'alive' && Math.hypot(targetX - en.x, player.y - en.y) < 0.2) { canX = false; break; }
                    }
                }
                if (canX) player.x = targetX;

                let targetY = player.y + (nextY - player.y);
                let checkY = targetY + (targetY > player.y ? radius : -radius);
                let mapCellY = map[Math.floor(checkY)][Math.floor(player.x)];
                let canY = (mapCellY === 0);

                if (canY) {
                    for (let en of enemies) {
                        if (en.state === 'alive' && Math.hypot(player.x - en.x, targetY - en.y) < 0.2) { canY = false; break; }
                    }
                }
                if (canY) player.y = targetY;
            }

            for (let i = 0; i < enemies.length; i++) {
                for (let j = i + 1; j < enemies.length; j++) {
                    let e1 = enemies[i];
                    let e2 = enemies[j];
                    if (e1.state === 'alive' && e2.state === 'alive') {
                        let r1 = e1.isBoss ? 0.8 : 0.45;
                        let r2 = e2.isBoss ? 0.8 : 0.45;
                        let minDist = (r1 + r2) / 2;
                        let distBetween = Math.hypot(e1.x - e2.x, e1.y - e2.y);
                        
                        if (distBetween < minDist && distBetween > 0.001) {
                            let push = (minDist - distBetween) * 0.15;
                            let px = ((e1.x - e2.x) / distBetween) * push;
                            let py = ((e1.y - e2.y) / distBetween) * push;
                            let m1 = e1.isBoss ? 0.28 : 0.22;
                            let nx1 = Math.floor(e1.x + px + (px > 0 ? m1 : -m1));
                            if (map[Math.floor(e1.y - m1)][nx1] === 0 && map[Math.floor(e1.y + m1)][nx1] === 0 && map[Math.floor(e1.y)][nx1] === 0) e1.x += px;
                            let ny1 = Math.floor(e1.y + py + (py > 0 ? m1 : -m1));
                            if (map[ny1][Math.floor(e1.x - m1)] === 0 && map[ny1][Math.floor(e1.x + m1)] === 0 && map[ny1][Math.floor(e1.x)] === 0) e1.y += py;
                            
                            let m2 = e2.isBoss ? 0.28 : 0.22;
                            let nx2 = Math.floor(e2.x - px + (-px > 0 ? m2 : -m2));
                            if (map[Math.floor(e2.y - m2)][nx2] === 0 && map[Math.floor(e2.y + m2)][nx2] === 0 && map[Math.floor(e2.y)][nx2] === 0) e2.x -= px;
                            let ny2 = Math.floor(e2.y - py + (-py > 0 ? m2 : -m2));
                            if (map[ny2][Math.floor(e2.x - m2)] === 0 && map[ny2][Math.floor(e2.x + m2)] === 0 && map[ny2][Math.floor(e2.x)] === 0) e2.y -= py;
                        }
                    }
                }
            }

            if (growlCooldown > 0) growlCooldown--;
            let nearestDistance = 999;
            backStalkWarning = false;

            /* --- ENEMY AI --- */
            enemies.forEach(en => {
                if (en.attackCooldown > 0) {
                    en.attackCooldown--;
                    if (en.isStriking && en.attackCooldown === 12) {
                        en.isStriking = false;
                        let dist = Math.hypot(player.x - en.x, player.y - en.y);
                        if (dist <= 0.9 && !isDead && en.state === 'alive') {
                            playerInvulnTimer = 30;
                            player.health = Math.max(0, player.health - 20);
                            damageFlash = 12;
                            screenShake = 10;
                            faceAnimTimer = 18;
                            spawnBlood();
                            doomAudio.playHurt();
                        }
                    }
                }

                if (en.state === 'alive') {
                    let distToPlayer = Math.hypot(player.x - en.x, player.y - en.y);
                    let canSeePlayer = hasLineOfSight(en.x, en.y, player.x, player.y);

                    if (en.isBoss) en.awake = true;
                    if (!en.awake && distToPlayer < 14.0 && canSeePlayer) en.awake = true;

                    let diffAngle = Math.atan2(en.y - player.y, en.x - player.x) - player.angle;
                    while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
                    while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;

                    if (en.awake && distToPlayer < 2.8 && Math.abs(diffAngle) > (Math.PI / 3) && canSeePlayer) {
                        backStalkWarning = true;
                    }

                    if (!isDead) {
                        if (en.awake) {
                            if (!canSeePlayer) {
                                en.rage += 0.05;
                                if (en.rage > 50) en.rage = 50; 
                                en.lostSightTimer++; 
                            } else {
                                en.rage = 0; 
                                en.lostSightTimer = 0; 
                            }

                            if (!en.isBoss && (en.lostSightTimer > 175 || distToPlayer > 15.0)) {
                                en.awake = false;
                                en.rage = 0;
                                en.lostSightTimer = 0;
                                en.wanderTimer = 60; 
                                en.wanderTargetX = en.x;
                                en.wanderTargetY = en.y;
                            } 
                            else if (distToPlayer <= (en.isBoss ? 1.0 : 0.7) && canSeePlayer) {
                                if (en.attackCooldown <= 0) {
                                    en.attackCooldown = 35;
                                    en.isStriking = true; 
                                    doomAudio.playBite(); 
                                }
                            } 
                            else {
                                let killBoost = 1.0 + Math.min(15, Math.floor(kills / 10)) * 0.03;
                                let baseSpeed = 0.045 * killBoost;
                                let eSpeed = (baseSpeed + (en.rage * 0.0004)) * (en.speedMult || 1.0);
                                
                                let targetX, targetY;

                                if (canSeePlayer) {
                                    targetX = player.x + en.targetOffsetX;
                                    targetY = player.y + en.targetOffsetY;
                                } else {
                                    let playerDistMap = calculateDistanceMap(player.x, player.y);
                                    let curTileX = Math.floor(en.x);
                                    let curTileY = Math.floor(en.y);
                                    let bestX = en.x;
                                    let bestY = en.y;
                                    let minD = (playerDistMap[curTileY] && playerDistMap[curTileY][curTileX] !== -1) 
                                               ? playerDistMap[curTileY][curTileX] : 9999;
                                    let neighbors = [
                                        {x: curTileX + 1, y: curTileY}, {x: curTileX - 1, y: curTileY},
                                        {x: curTileX, y: curTileY + 1}, {x: curTileX, y: curTileY - 1}
                                    ];
                                    for(let n of neighbors) {
                                        if(n.y >= 0 && n.y < map.length && n.x >= 0 && n.x < map[0].length) {
                                            let cell = map[n.y][n.x];
                                            if(cell === 0 || cell === 6 || cell === 7) {
                                                let d = playerDistMap[n.y][n.x];
                                                if(d !== -1 && d < minD) {
                                                    minD = d;
                                                    bestX = n.x + 0.5;
                                                    bestY = n.y + 0.5;
                                                }
                                            }
                                        }
                                    }
                                    targetX = bestX;
                                    targetY = bestY;
                                }

                                let dToTarget = Math.hypot(targetX - en.x, targetY - en.y);
                                if (dToTarget > 0.05) {
                                    let dirX = (targetX - en.x) / dToTarget;
                                    let dirY = (targetY - en.y) / dToTarget;
                                    let moveX = dirX * eSpeed;
                                    let moveY = dirY * eSpeed;
                                    
                                    let eMargin = en.isBoss ? 0.28 : 0.22;
                                    let nextMapX = Math.floor(en.x + moveX + (moveX > 0 ? eMargin : -eMargin));
                                    let nextMapY = Math.floor(en.y + moveY + (moveY > 0 ? eMargin : -eMargin));

                                    if (map[Math.floor(en.y - eMargin)][nextMapX] === 0 && 
                                        map[Math.floor(en.y + eMargin)][nextMapX] === 0 && 
                                        map[Math.floor(en.y)][nextMapX] === 0) {
                                        en.x += moveX;
                                    }
                                    if (map[nextMapY][Math.floor(en.x - eMargin)] === 0 && 
                                        map[nextMapY][Math.floor(en.x + eMargin)] === 0 && 
                                        map[nextMapY][Math.floor(en.x)] === 0) {
                                        en.y += moveY;
                                    }
                                }
                            }
                        } else {
                            en.wanderTimer--;
                            if (en.wanderTimer <= 0) {
                                let wTile = getRandomFloorTile();
                                if (Math.hypot(wTile.x - en.x, wTile.y - en.y) < 6.0) {
                                    en.wanderTargetX = wTile.x;
                                    en.wanderTargetY = wTile.y;
                                    en.wanderTimer = Math.floor(Math.random() * 105 + 105); 
                                } else {
                                    en.wanderTimer = 10; 
                                }
                            }

                            let dToTarget = Math.hypot(en.wanderTargetX - en.x, en.wanderTargetY - en.y);
                            if (dToTarget > 0.2) {
                                let eSpeed = 0.020 * (en.speedMult || 1.0); 
                                let dirX = (en.wanderTargetX - en.x) / dToTarget;
                                let dirY = (en.wanderTargetY - en.y) / dToTarget;
                                let moveX = dirX * eSpeed;
                                let moveY = dirY * eSpeed;
                                
                                let eMargin = en.isBoss ? 0.28 : 0.22;
                                let nextMapX = Math.floor(en.x + moveX + (moveX > 0 ? eMargin : -eMargin));
                                let nextMapY = Math.floor(en.y + moveY + (moveY > 0 ? eMargin : -eMargin));
                                
                                if (map[Math.floor(en.y - eMargin)][nextMapX] === 0 && 
                                    map[Math.floor(en.y + eMargin)][nextMapX] === 0 && 
                                    map[Math.floor(en.y)][nextMapX] === 0) {
                                    en.x += moveX;
                                }
                                if (map[nextMapY][Math.floor(en.x - eMargin)] === 0 && 
                                    map[nextMapY][Math.floor(en.x + eMargin)] === 0 && 
                                    map[nextMapY][Math.floor(en.x)] === 0) {
                                    en.y += moveY;
                                }
                            }
                        }
                    }
                } else if (en.state === 'dying') {
                    en.deathTimer--;
                    if (en.deathTimer <= 0) {
                        en.state = 'dead';
                        en.deathTimer = 90; 
                    }
                } else if (en.state === 'dead') {
                    en.deathTimer--;
                    if (en.deathTimer <= 0) {
                        if (en.isBoss) {
                            en.state = 'removed'; 
                        } else {
                            en.state = 'alive';
                            let tile;
                            do { tile = getRandomFloorTile(); } while (Math.hypot(tile.x - player.x, tile.y - player.y) < 6.0);
                            en.x = tile.x; en.y = tile.y; 
                            en.awake = false; en.rage = 0; en.hp = 1;
                            en.lostSightTimer = 0; 
                            en.wanderTimer = 50; 
                        }
                    }
                }
            });

            if (!isDead && nearestDistance <= 4.0 && growlCooldown <= 0) {
                let vol = 0.45 - (nearestDistance * 0.09);
                doomAudio.playGrowl(vol);
                growlCooldown = Math.floor(35 + nearestDistance * 20);
            }

            /* --- ITEM PICKUPS --- */
            if (!isDead) {
                for (let i = items.length - 1; i >= 0; i--) {
                    let it = items[i];
                    
                    if (it.zOffset !== undefined && it.zOffset < 0) {
                        it.x += it.vx || 0;
                        it.y += it.vy || 0;
                        it.zOffset += it.vz;
                        it.vz += 0.008;
                        if (it.zOffset >= 0) {
                            it.zOffset = 0; 
                            it.vx = 0; it.vy = 0;
                        }
                    }
                    let d = Math.hypot(player.x - it.x, player.y - it.y);
                    
                    if (d < 0.45) {
                        let collected = false;
                        
                        if (it.type === 'medkit' && player.health < 100) {
                            player.health = Math.min(100, player.health + 25);
                            hpFlashTimer = 35;
                            collected = true;
                        } else if (it.type === 'ammo') {
                            if (player.ammo < 50) {
                                player.ammo = Math.min(40, player.ammo + 5); 
                                ammoFlashTimer = 35;
                                collected = true;
                            }
                        } else if (it.type === 'time') {
                            player.timeLeft = Math.min(60, player.timeLeft + 10);
                            floatingTexts.push({ 
                                x: it.x, 
                                y: it.y, 
                                text: "+10s", 
                                life: 35, 
                                maxLife: 35 
                            });
                            collected = true;
                        }

                        if (collected) {
                            doomAudio.playItem();
                            items.splice(i, 1);
                        }
                    }
                }
            }

            /* --- WEAPONS & COMBAT --- */
            if (player.currentWeapon === 'pistols' && player.ammo <= 0 && player.weaponSwitchTimer === 0 && gunAnim === 0) {
                player.weaponSwitchTimer = 20;
            } else if (player.currentWeapon === 'knife' && player.ammo > 0 && player.weaponSwitchTimer === 0 && gunAnim === 0) {
                player.weaponSwitchTimer = 20;
            }

            if (player.weaponSwitchTimer > 0) {
                player.weaponSwitchTimer--;
                if (player.weaponSwitchTimer === 10) {
                    player.currentWeapon = (player.currentWeapon === 'pistols') ? 'knife' : 'pistols';
                }
            }

            if (!isDead && keys['Space'] && gunAnim === 0 && player.weaponSwitchTimer === 0) {
                if (player.currentWeapon === 'pistols') {
                    player.lastShotSide = (player.lastShotSide === 'right') ? 'left' : 'right';
                    gunAnim = 14; 
                    flash = true;
                    player.ammo--;
                    faceAnimTimer = 18;
                    doomAudio.playShot();
                    
                    enemies.forEach(en => {
                        if (Math.hypot(en.x - player.x, en.y - player.y) < 12) en.awake = true;
                    });

                    let barrelOffset = (player.lastShotSide === 'left') ? -0.06 : 0.06;
                    let startX = player.x + Math.cos(player.angle + Math.PI / 2) * barrelOffset;
                    let startY = player.y + Math.sin(player.angle + Math.PI / 2) * barrelOffset;
                    
                    let targetX = player.x + Math.cos(player.angle) * 10;
                    let targetY = player.y + Math.sin(player.angle) * 10;
                    
                    let bAngle = Math.atan2(targetY - startY, targetX - startX);
                    bAngle += (Math.random() - 0.5) * 0.03; 
                    
                    bullets.push({
                        x: startX, y: startY,
                        dirX: Math.cos(bAngle), dirY: Math.sin(bAngle),
                        zOffset: (Math.random() - 0.5) * 0.12, 
                        life: 20
                    });
                } else if (player.currentWeapon === 'knife') {
                    gunAnim = 16; 
                    faceAnimTimer = 18;
                    currentKnifeAttackType = Math.random() < 0.5 ? 'stab' : 'swing';
                    doomAudio.playKnife();
                    
                    enemies.forEach(en => {
                        if (Math.hypot(en.x - player.x, en.y - player.y) < 4) en.awake = true;
                    });
                    
                    enemies.forEach(en => {
                        if (en.state === 'alive') {
                            let hitRadius = en.isBoss ? 1.6 : 1.3;
                            let dist = Math.hypot(en.x - player.x, en.y - player.y);
                            if (dist < hitRadius) {
                                let angleToEnemy = Math.atan2(en.y - player.y, en.x - player.x) - player.angle;
                                while (angleToEnemy < -Math.PI) angleToEnemy += Math.PI * 2;
                                while (angleToEnemy > Math.PI) angleToEnemy -= Math.PI * 2;
                                
                                if (Math.abs(angleToEnemy) < fov / 1.5) {
                                    en.hp--;
                                    if (en.hp <= 0) {
                                        en.state = 'dying';
                                        en.deathTimer = 30;
                                        kills++;
                                        doomAudio.playMonsterDeath();

                                        let timeBonus = en.isBoss ? 10 : 1;
                                        player.timeLeft = Math.min(60, player.timeLeft + timeBonus); 

                                        floatingTexts.push({ 
                                            x: en.x, 
                                            y: en.y, 
                                            text: "+" + timeBonus + "s", 
                                            life: 35, 
                                            maxLife: 35 
                                        });
                                        
                                        if (Math.random() < 0.20 || en.isBoss) {
                                            items.push({ type: 'ammo', x: en.x, y: en.y, zOffset: -0.15, vz: -0.07, vx: (Math.random()-0.5)*0.08, vy: (Math.random()-0.5)*0.08 });
                                            if (en.isBoss) items.push({ type: 'medkit', x: en.x + 0.2, y: en.y, zOffset: -0.15, vz: -0.09, vx: (Math.random()-0.5)*0.08, vy: (Math.random()-0.5)*0.08 });
                                            if (items.length > 15) items.shift();
                                        }

                                        if (kills % 50 === 0 && kills > 0) {
                                            let bTile;
                                            do { bTile = getRandomFloorTile(); } while (Math.hypot(bTile.x - player.x, bTile.y - player.y) < 8.0);
                                            enemies.push({ 
                                                x: bTile.x, 
                                                y: bTile.y, 
                                                state: 'alive', 
                                                deathTimer: 0, 
                                                attackCooldown: 0, 
                                                awake: true, 
                                                rage: 0, 
                                                hp: 5, 
                                                isBoss: true, 
                                                isStriking: false,
                                                speedMult: 0.8, 
                                                sizeMult: 1.6, 
                                                targetOffsetX: (Math.random() - 0.5) * 1.5, 
                                                targetOffsetY: (Math.random() - 0.5) * 1.5,
                                                lostSightTimer: 0, 
                                                wanderTimer: 0, 
                                                wanderTargetX: bTile.x, 
                                                wanderTargetY: bTile.y 
                                            });
                                        }
                                    } else {
                                        if (en.isBoss) {
                                            doomAudio.playBossHurt();
                                        } else {
                                            doomAudio.playHurt();
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
            } else {
                if (gunAnim > 0) gunAnim--;
                if (gunAnim < 13) flash = false; 
            }

            if (faceAnimTimer > 0) faceAnimTimer--;

            gazeTimer++;
            if (gazeTimer > 30) { 
                gazeTimer = 0;
                gazeDirection = Math.floor(Math.random() * 3) - 1;
            }

            /* --- PROJECTILES & DECALS --- */
            for (let i = bullets.length - 1; i >= 0; i--) {
                let b = bullets[i];
                b.x += b.dirX * 0.4;
                b.y += b.dirY * 0.4;
                b.life--;

                let mapX = Math.floor(b.x);
                let mapY = Math.floor(b.y);
                let hitWall = false;
                
                if (map[mapY][mapX] > 0) {
                    hitWall = true;
                    
                    let vx = b.dirX * 0.4;
                    let vy = b.dirY * 0.4;
                    let px = b.x - vx;
                    let py = b.y - vy;
                    
                    let tX = -1, tY = -1;
                    if (px < mapX) tX = (mapX - px) / vx;
                    else if (px > mapX + 1) tX = (mapX + 1 - px) / vx;
                    
                    if (py < mapY) tY = (mapY - py) / vy;
                    else if (py > mapY + 1) tY = (mapY + 1 - py) / vy;
                    
                    let t = 0;
                    let hitSide = 0;
                    
                    if (tX >= 0 && tX <= 1) { t = tX; hitSide = 0; }
                    if (tY >= 0 && tY <= 1 && tY > t) { t = tY; hitSide = 1; }
                    
                    let hitX = px + vx * t;
                    let hitY = py + vy * t;

                    let hitCoord = 0;
                    let hitDir = 1;

                    if (hitSide === 0) {
                        hitCoord = hitY - Math.floor(hitY);
                        if (b.dirX > 0) hitCoord = 1.0 - hitCoord;
                        hitDir = b.dirX > 0 ? 1 : -1;
                    } else {
                        hitCoord = hitX - Math.floor(hitX);
                        if (b.dirY < 0) hitCoord = 1.0 - hitCoord;
                        hitDir = b.dirY > 0 ? 1 : -1;
                    }

                    decals.push({
                        mapX: mapX,
                        mapY: mapY,
                        side: hitSide,
                        dir: hitDir, 
                        hitCoord: hitCoord,
                        zOffset: b.zOffset,
                        life: 18
                    });
                }

                let hitEnemy = false;
                enemies.forEach(en => {
                    let hitRadius = en.isBoss ? 0.7 : 0.45;
                    if (en.state === 'alive' && Math.hypot(en.x - b.x, en.y - b.y) < hitRadius) {
                        hitEnemy = true;
                        en.hp--;
                        if (en.hp <= 0) {
                            en.state = 'dying';
                            en.deathTimer = 30;
                            kills++;
                            doomAudio.playMonsterDeath();
                            
                            let timeBonus = en.isBoss ? 10 : 1;
                            player.timeLeft = Math.min(60, player.timeLeft + timeBonus); 

                            floatingTexts.push({ 
                                x: en.x, 
                                y: en.y, 
                                text: "+" + timeBonus + "s", 
                                life: 35, 
                                maxLife: 35 
                            });
                            
                            if (Math.random() < 0.20 || en.isBoss) {
                                items.push({ type: 'ammo', x: en.x, y: en.y, zOffset: -0.15, vz: -0.07, vx: (Math.random()-0.5)*0.08, vy: (Math.random()-0.5)*0.08 });
                                if (en.isBoss) items.push({ type: 'medkit', x: en.x + 0.2, y: en.y, zOffset: -0.15, vz: -0.09, vx: (Math.random()-0.5)*0.08, vy: (Math.random()-0.5)*0.08 });
                                if (items.length > 15) items.shift();
                            }

                            if (kills % 50 === 0 && kills > 0) {
                                let bTile;
                                do { bTile = getRandomFloorTile(); } while (Math.hypot(bTile.x - player.x, bTile.y - player.y) < 8.0);
                                enemies.push({ x: bTile.x, y: bTile.y, state: 'alive', deathTimer: 0, attackCooldown: 0, awake: true, rage: 0, hp: 5, isBoss: true, speedMult: 0.55, sizeMult: 1.6 });
                            }
                        } else {
                            if (en.isBoss) {
                                doomAudio.playBossHurt(); 
                            } else {
                                doomAudio.playHurt(); 
                            }
                        }
                    }
                });

                if (hitWall || hitEnemy || b.life <= 0) {
                    bullets.splice(i, 1);
                }
            } 

            if (skipRender) continue;

            /* --- RENDERING: FLOOR & CEILING --- */
            ctx.save();
            if (screenShake > 0) {
                let shakeX = (Math.random() - 0.5) * screenShake * 1.5;
                let shakeY = (Math.random() - 0.5) * screenShake * 1.5;
                ctx.translate(shakeX, shakeY);
                screenShake--;
            }

            let halfH = viewportHeight / 2;
            let dirX = Math.cos(player.angle);
            let dirY = Math.sin(player.angle);
            let planeLen = Math.tan(halfFov);
            let planeX = -dirY * planeLen;
            let planeY = dirX * planeLen;

            let rayDirX0 = dirX - planeX;
            let rayDirY0 = dirY - planeY;
            let rayDirX1 = dirX + planeX;
            let rayDirY1 = dirY + planeY;

            for (let y = halfH; y < viewportHeight; y += 2) {
                let p = y - halfH;
                let rowDistance = halfH / (p === 0 ? 0.1 : p);
                let rowLight = getLightLevel(rowDistance, false);

                let floorStepX = rowDistance * (rayDirX1 - rayDirX0) / screenWidth;
                let floorStepY = rowDistance * (rayDirY1 - rayDirY0) / screenWidth;

                let floorX = player.x + rowDistance * rayDirX0;
                let floorY = player.y + rowDistance * rayDirY0;

                let flashAddR = 0, flashAddG = 0, flashAddB = 0;
                if (flash && !isDead) {
                    let normY = p / halfH; 
                    let flashFactor = Math.pow(normY, 3);
                    let flashInt = flashFactor * 90; 
                    flashAddR = flashInt;
                    flashAddG = flashInt * 0.75;
                    flashAddB = flashInt * 0.3;
                }

                let ceilY = viewportHeight - y;
                let cR = Math.floor(15 * rowLight);
                let cG = Math.floor(15 * rowLight);
                let cB = Math.floor(20 * rowLight);
                ctx.fillStyle = `rgb(${cR}, ${cG}, ${cB})`;
                ctx.fillRect(0, ceilY, screenWidth, 2);

                for (let x = 0; x < screenWidth; x += 4) {
                    let checker = (Math.floor(floorX * 2) + Math.floor(floorY * 2)) % 2 === 0;
                    let fR = checker ? 20 : 35;
                    let fG = checker ? 20 : 35;
                    let fB = checker ? 25 : 40;

                    if (flashAddR > 0) {
                        fR = Math.min(255, fR + flashAddR);
                        fG = Math.min(255, fG + flashAddG);
                        fB = Math.min(255, fB + flashAddB);
                    }

                    fR = Math.floor(fR * rowLight);
                    fG = Math.floor(fG * rowLight);
                    fB = Math.floor(fB * rowLight);

                    ctx.fillStyle = `rgb(${fR}, ${fG}, ${fB})`;
                    ctx.fillRect(x, y, 4, 2);

                    floorX += floorStepX * 4;
                    floorY += floorStepY * 4;
                }
            }

            /* --- RENDERING: WALLS (DDA RAYCASTING) --- */
            for (let x = 0; x < screenWidth; x++) {
                let cameraX = 2 * x / screenWidth - 1;
                let rayAngle = player.angle + Math.atan(cameraX * Math.tan(halfFov));

                let rayDirX = Math.cos(rayAngle);
                let rayDirY = Math.sin(rayAngle);

                let mapX = Math.floor(player.x);
                let mapY = Math.floor(player.y);

                let deltaDistX = Math.abs(1 / (rayDirX === 0 ? 1e-10 : rayDirX));
                let deltaDistY = Math.abs(1 / (rayDirY === 0 ? 1e-10 : rayDirY));

                let stepX, stepY;
                let sideDistX, sideDistY;

                if (rayDirX < 0) {
                    stepX = -1;
                    sideDistX = (player.x - mapX) * deltaDistX;
                } else {
                    stepX = 1;
                    sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
                }

                if (rayDirY < 0) {
                    stepY = -1;
                    sideDistY = (player.y - mapY) * deltaDistY;
                } else {
                    stepY = 1;
                    sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
                }

                let hit = false;
                let hitSide = 0;
                let wallType = 1;

                while (!hit) {
                    if (sideDistX < sideDistY) {
                        sideDistX += deltaDistX;
                        mapX += stepX;
                        hitSide = 0;
                    } else {
                        sideDistY += deltaDistY;
                        mapY += stepY;
                        hitSide = 1;
                    }

                    if (mapX < 0 || mapX >= map[0].length || mapY < 0 || mapY >= map.length) {
                        hit = true;
                        wallType = 1;
                        break;
                    }

                    let mt = map[mapY][mapX];
                    if (mt > 0) {
                        hit = true;
                        wallType = mt;
                    }
                }

                let rayDist = (hitSide === 0) ? (sideDistX - deltaDistX) : (sideDistY - deltaDistY);
                let correctedDist = rayDist * Math.cos(rayAngle - player.angle);
                if (correctedDist < 0.1) correctedDist = 0.1;
                zBuffer[x] = correctedDist;

                let tileFactor = 1.0; 
                if (wallType === 5 || wallType === 9) {
                    tileFactor = 1.0; 
                }

                let wallHitCoord = 0;
                if (hitSide === 0) {
                    wallHitCoord = (player.y + rayDist * rayDirY) * tileFactor;
                    wallHitCoord -= Math.floor(wallHitCoord);
                    if (rayDirX > 0) wallHitCoord = 1.0 - wallHitCoord; 
                } else {
                    wallHitCoord = (player.x + rayDist * rayDirX) * tileFactor;
                    wallHitCoord -= Math.floor(wallHitCoord);
                    if (rayDirY < 0) wallHitCoord = 1.0 - wallHitCoord; 
                }

                let light = getLightLevel(correctedDist, flash && !isDead);
                let sideShade = (hitSide === 0) ? 0.75 : 1.0; 
                let effLight = light * sideShade;

                let wallHeight = Math.floor(450 / correctedDist);
                let drawStart = Math.floor((viewportHeight - wallHeight) / 2);

                let tex = wallTextures[wallType] || wallTextures[1];

                if (tex && tex.complete && tex.naturalWidth > 0) {
                    let tWidth = tex.naturalWidth;
                    let tHeight = tex.naturalHeight;
                    let texX = Math.floor(wallHitCoord * tWidth);
                    if (texX < 0) texX = 0;
                    if (texX >= tWidth) texX = tWidth - 1;

                    let stepHeight = wallHeight / tileFactor;
                    for (let i = 0; i < tileFactor; i++) {
                        ctx.drawImage(tex, texX, 0, 1, tHeight, x, drawStart + (i * stepHeight), 1, Math.ceil(stepHeight));
                    }
                } else {
                    let r = 0, g = 0, b = 0;
                    if (wallType === 1 || wallType === 10) { r = 150; g = 150; b = 150; } 
                    else if (wallType === 2) { r = 180; g = 50; b = 50; } 
                    else if (wallType === 3 || wallType === 8 || wallType === 9) { r = 100; g = 110; b = 120; } 
                    else if (wallType === 4) { r = 130; g = 100; b = 50; } 
                    else if (wallType === 5) { r = 40; g = 150; b = 40; } 
                    else if (wallType === 6 || wallType === 7) { r = 180; g = 180; b = 180; }
                    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    ctx.fillRect(x, drawStart, 1, wallHeight);
                }
                
                /* --- WALL DECALS --- */
                let baseHitCoord = (hitSide === 0) ? (player.y + rayDist * rayDirY) : (player.x + rayDist * rayDirX);
                baseHitCoord -= Math.floor(baseHitCoord);
                if (hitSide === 0 && rayDirX > 0) baseHitCoord = 1.0 - baseHitCoord;
                if (hitSide === 1 && rayDirY < 0) baseHitCoord = 1.0 - baseHitCoord;

                let currentFaceDir = (hitSide === 0) ? stepX : stepY;

                for (let d = 0; d < decals.length; d++) {
                    let dec = decals[d];
                    
                    if (dec.mapX === mapX && dec.mapY === mapY && dec.side === hitSide && dec.dir === currentFaceDir) {
                        let dx = baseHitCoord - dec.hitCoord;
                        let decalRadius = 0.05; 
                        
                        if (Math.abs(dx) < decalRadius) {
                            let aspectFix = 1.38; 
                            let colHeight = Math.sqrt(decalRadius * decalRadius - dx * dx);
                            let pixelHeight = colHeight * wallHeight * aspectFix; 
                            let centerY = viewportHeight / 2;
                            let centerDrawY = centerY + (dec.zOffset * wallHeight);

                            if (decalImg.complete && decalImg.naturalWidth > 0) {
                                let texU = (dx + decalRadius) / (decalRadius * 2);
                                let texX = Math.floor(texU * decalImg.naturalWidth);
                                if (texX < 0) texX = 0;
                                if (texX >= decalImg.naturalWidth) texX = decalImg.naturalWidth - 1;
                                
                                let decalScreenHeight = wallHeight * (decalRadius * 2) * aspectFix;
                                let drawY = centerDrawY - (decalScreenHeight / 2);
                                
                                ctx.drawImage(decalImg, texX, 0, 1, decalImg.naturalHeight, x, drawY, 1, decalScreenHeight);
                            } else {
                                ctx.fillStyle = '#0a0a0a';
                                ctx.fillRect(x, centerDrawY - pixelHeight, 1, pixelHeight * 2);
                            }

                            if (dec.life > 0) {
                                let heat = dec.life / 18;
                                let heatRadius = decalRadius * 0.8; 
                                
                                if (Math.abs(dx) < heatRadius) {
                                    let heatColHeight = Math.sqrt(heatRadius * heatRadius - dx * dx);
                                    let heatPixelHeight = heatColHeight * wallHeight * aspectFix;

                                    ctx.globalCompositeOperation = "lighter";
                                    
                                    let grad = ctx.createLinearGradient(0, centerDrawY - heatPixelHeight, 0, centerDrawY + heatPixelHeight);
                                    grad.addColorStop(0, `rgba(150, 0, 0, 0)`);
                                    grad.addColorStop(0.15, `rgba(255, 30, 0, ${heat * 0.6})`); 
                                    grad.addColorStop(0.5, `rgba(255, 255, 180, ${heat * 1.2})`);
                                    grad.addColorStop(0.85, `rgba(255, 30, 0, ${heat * 0.6})`);
                                    grad.addColorStop(1, `rgba(150, 0, 0, 0)`);

                                    ctx.fillStyle = grad;
                                    ctx.fillRect(x, centerDrawY - heatPixelHeight, 1, heatPixelHeight * 2);

                                    ctx.globalCompositeOperation = "source-over";
                                }
                            }
                        }
                    }
                }

                let sTop = Math.max(0, drawStart);
                let sBottom = Math.min(viewportHeight, drawStart + wallHeight);
                if (sBottom > sTop) {
                    if (effLight < 1.0) {
                        ctx.fillStyle = `rgba(0, 0, 0, ${1.0 - effLight})`;
                        ctx.fillRect(x, sTop, 1, sBottom - sTop);
                    } else if (effLight > 1.0) {
                        let flashIntensity = Math.min(0.75, (effLight - 1.0) * 0.8);
                        ctx.fillStyle = `rgba(255, 170, 50, ${flashIntensity})`;
                        ctx.fillRect(x, sTop, 1, sBottom - sTop);
                    }
                }
            }

            /* --- RENDERING: SPRITES & Z-BUFFER --- */
            let renderQueue = [];

            items.forEach(it => {
                let dist = Math.hypot(it.x - player.x, it.y - player.y);
                renderQueue.push({ type: 'item', obj: it, dist: dist });
            });

            enemies.forEach(en => {
                if (en.state !== 'removed') {
                    let dist = Math.hypot(en.x - player.x, en.y - player.y);
                    renderQueue.push({ type: 'enemy', obj: en, dist: dist });
                }
            });

            floatingTexts.forEach(ft => {
                let dist = Math.hypot(ft.x - player.x, ft.y - player.y);
                renderQueue.push({ type: 'text', obj: ft, dist: dist });
            });
            
            renderQueue.sort((a, b) => b.dist - a.dist);
            renderQueue.forEach(item => {
                let spriteObj = item.obj;
                let dist = item.dist;

                let spriteAngle = Math.atan2(spriteObj.y - player.y, spriteObj.x - player.x) - player.angle;
                while (spriteAngle < -Math.PI) spriteAngle += Math.PI * 2;
                while (spriteAngle > Math.PI) spriteAngle -= Math.PI * 2;
                
                let angleMargin = (1.5 / dist) + 0.5; 
                if (Math.abs(spriteAngle) < halfFov + angleMargin && dist > 0.08) {
                    let screenX = Math.floor((screenWidth / 2) + (spriteAngle / fov) * screenWidth);
                    let size = Math.floor(250 / dist);
                    let light = getLightLevel(dist, flash && !isDead);

                    if (item.type === 'item') {
                        let img = itemSprites[spriteObj.type];

                        if (img && img.complete && img.naturalWidth > 0) {
                            let scale = (size * 0.4) / img.naturalHeight;
                            let itemWidth = Math.floor(img.naturalWidth * scale);
                            let itemHeight = Math.floor(img.naturalHeight * scale);
                            let startX = Math.floor(screenX - itemWidth / 2);
                            
                            let wallHeight = Math.floor(450 / dist);
                            let floorY = Math.floor(viewportHeight / 2 + wallHeight / 2);
                            
                            let zPos = spriteObj.zOffset !== undefined ? spriteObj.zOffset : 0;
                            if (zPos === 0) zPos = Math.sin(Date.now() / 200) * 0.03 - 0.03; 
                            
                            let drawY = floorY - itemHeight + (zPos * wallHeight); 
                            
                            let pulse = (Math.sin(Date.now() / 200) + 1) * 0.5; 
                            let glowAlpha = pulse * 0.6 + 0.3;
                            let totalBrightness = light + glowAlpha;

                            if (!window.itemBuffer) {
                                window.itemBuffer = document.createElement('canvas');
                                window.itemCtx = window.itemBuffer.getContext('2d');
                            }
                            
                            window.itemBuffer.width = img.naturalWidth;
                            window.itemBuffer.height = img.naturalHeight;

                            window.itemCtx.filter = `brightness(${totalBrightness}) drop-shadow(0px 0px 4px rgba(255, 215, 0, ${glowAlpha}))`;
                            window.itemCtx.drawImage(img, 0, 0);
                            window.itemCtx.filter = 'none';

                            for (let sx = Math.max(0, startX); sx < Math.min(screenWidth, startX + itemWidth); sx++) {
                                if (zBuffer[sx] > dist) {
                                    let texX = Math.floor(((sx - startX) / itemWidth) * img.naturalWidth);
                                    ctx.drawImage(window.itemBuffer, texX, 0, 1, img.naturalHeight, sx, drawY, 1, itemHeight);
                                }
                            }
                        }
                    }
                    else if (item.type === 'text') {
                        let ft = spriteObj;
                        let wallHeight = Math.floor(450 / dist);
                        let rise = (1 - (ft.life / ft.maxLife)) * 0.6;
                        let drawY = viewportHeight / 2 + (0.1 - rise) * wallHeight; 
                        
                        ctx.fillStyle = `rgba(255, 200, 0, ${ft.life / ft.maxLife})`;
                        let fontSize = Math.max(12, Math.floor(wallHeight * 0.25));
                        ctx.font = `bold ${fontSize}px 'VT323', monospace`;
                        ctx.textAlign = 'center';
                        
                        ctx.fillText(ft.text, screenX + 1, drawY + 1);
                        ctx.fillText(ft.text, screenX, drawY);
                        ctx.textAlign = 'start';
                    }
                    else if (item.type === 'enemy') {
                        let en = spriteObj;
                        let frameIndex = 0;

                        if (en.state === 'alive') {
                            if (en.attackCooldown > 0) {
                                if (en.attackCooldown > 24) frameIndex = 4;
                                else if (en.attackCooldown > 12) frameIndex = 5;
                                else frameIndex = 6;
                            } else if (en.awake) {
                                frameIndex = Math.floor(Date.now() / 180) % 4;
                            } else {
                                frameIndex = 0;
                            }
                        } else if (en.state === 'dying') {
                            let deathStep = Math.floor((30 - en.deathTimer) / 5); 
                            if (deathStep < 0) deathStep = 0;
                            if (deathStep > 5) deathStep = 5;
                            frameIndex = 7 + deathStep;
                        } else if (en.state === 'dead') {
                            frameIndex = 12;
                        }

                        let currentMonsterImg = monsterFrames[frameIndex] || monsterFrames[0];

                        if (currentMonsterImg && currentMonsterImg.complete && currentMonsterImg.naturalWidth > 0) {
                            let baseImg = monsterFrames[0];
                            let baseHeight = (baseImg && baseImg.naturalHeight > 0) ? baseImg.naturalHeight : 100;
                            
                            let sizeMultiplier = en.sizeMult || 1.0;
                            let scale = (size * 1.5 * sizeMultiplier) / baseHeight; 
                            let mWidth = Math.floor(currentMonsterImg.naturalWidth * scale);
                            let mHeight = Math.floor(currentMonsterImg.naturalHeight * scale);
                            let mDrawX = screenX - mWidth / 2;
                            
                            let wallHeight = Math.floor(450 / dist);
                            let floorY = Math.floor(viewportHeight / 2 + wallHeight / 2);
                            let mDrawY = floorY - mHeight;

                            if (!window.mobBuffer) {
                                window.mobBuffer = document.createElement('canvas');
                                window.mobCtx = window.mobBuffer.getContext('2d');
                            }
                            
                            window.mobBuffer.width = currentMonsterImg.naturalWidth;
                            window.mobBuffer.height = currentMonsterImg.naturalHeight;

                            if (en.isBoss) {
                                window.mobCtx.filter = `brightness(${light * 1.5}) sepia(1) saturate(10) hue-rotate(330deg)`;
                            } else {
                                window.mobCtx.filter = `brightness(${light})`;
                            }
                            window.mobCtx.drawImage(currentMonsterImg, 0, 0);
                            window.mobCtx.filter = 'none';

                            for (let sx = Math.max(0, Math.floor(mDrawX)); sx < Math.min(screenWidth, Math.floor(mDrawX + mWidth)); sx++) {
                                if (zBuffer[sx] > dist) {
                                    let texX = Math.floor(((sx - mDrawX) / mWidth) * currentMonsterImg.naturalWidth);
                                    ctx.drawImage(
                                        window.mobBuffer, 
                                        texX, 0, 1, currentMonsterImg.naturalHeight, 
                                        sx, mDrawY, 1, mHeight
                                    );
                                }
                            }
                        }
                    }
                    else if (item.type === 'decal') {
                        let dec = spriteObj;
                        let perpDist = dist * Math.cos(spriteAngle);
                        let wallHeight = Math.floor(450 / perpDist);
                        let sizeDecal = Math.max(3, Math.floor(wallHeight * 0.025)); 
                        
                        let centerY = viewportHeight / 2;
                        let drawY = centerY + (dec.zOffset * wallHeight); 

                        let startX = Math.floor(screenX - sizeDecal);
                        let endX = Math.floor(screenX + sizeDecal);

                        for (let sx = startX; sx <= endX; sx++) {
                            if (sx >= 0 && sx < screenWidth && zBuffer[sx] >= perpDist - 0.1) {
                                let dx = sx - screenX;
                                let colHeight = Math.sqrt(sizeDecal * sizeDecal - dx * dx);
                                if (sx < screenWidth - 1) {
                                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                                    ctx.fillRect(sx + 1, drawY - colHeight + 1, 1, colHeight * 2);
                                }
                                ctx.fillStyle = '#111111';
                                let coreHeight = Math.max(0, colHeight - 0.5); 
                                ctx.fillRect(sx, drawY - coreHeight, 1, coreHeight * 2);
                            }
                        }
                    }
                }
            });
            
            bullets.forEach(b => {
                let bulletAngle = Math.atan2(b.y - player.y, b.x - player.x) - player.angle;
                while (bulletAngle < -Math.PI) bulletAngle += Math.PI * 2;
                while (bulletAngle > Math.PI) bulletAngle -= Math.PI * 2;

                if (Math.abs(bulletAngle) < fov) {
                    let dist = Math.hypot(b.x - player.x, b.y - player.y);
                    let screenX = Math.floor((screenWidth / 2) + (bulletAngle / fov) * screenWidth);
                    let bSize = Math.max(4, Math.floor(20 / dist));
                    
                    let wallHeight = Math.floor(450 / dist);
                    let drawY = viewportHeight / 2 + (b.zOffset * wallHeight);

                    if (screenX >= 0 && screenX < screenWidth && zBuffer[screenX] > dist) {
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = "#ffaa00";

                        ctx.fillStyle = "#ffcc00";
                        ctx.beginPath();
                        ctx.arc(screenX, drawY, bSize, 0, Math.PI * 2);
                        ctx.fill();
    
                        ctx.shadowBlur = 0;

                        ctx.fillStyle = "#ffffee";
                        ctx.beginPath();
                        ctx.arc(screenX, drawY, bSize * 0.6, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            });

            /* --- RENDERING: VIEWMODEL WEAPONS --- */
            let bobbing = (1 - Math.cos(bobPhase)) * 8;
            let dropOffset = 0;
            if (player.weaponSwitchTimer > 0) {
                let progress = Math.abs(10 - player.weaponSwitchTimer) / 10; 
                dropOffset = (1 - progress) * 200;
            }
            
            let gunYOffset = bobbing + gunDropOffset + dropOffset;

            if (player.currentWeapon === 'pistols') {
                let currentAnimFrame = 0;
                if (gunAnim > 0) {
                    let step = Math.floor((14 - gunAnim) / 3.2) + 1; 
                    if (step > 5) step = 5;
                    currentAnimFrame = (player.lastShotSide === 'right') ? step : step + 5; 
                }

                let currentSprite = weaponFrames[currentAnimFrame] || weaponFrames[0];
                let spriteName = frameNames[currentAnimFrame]; 

                if (currentSprite && currentSprite.complete && currentSprite.naturalWidth > 0) {
                    let scale = 1.2; 
                    let drawWidth = currentSprite.naturalWidth * scale;
                    let drawHeight = currentSprite.naturalHeight * scale;

                    let centerX = (screenWidth - drawWidth) / 2;
                    let drawY = viewportHeight - drawHeight + 10 + gunYOffset;

                    let idleSprite = weaponFrames[0]; 
                    let idleW = idleSprite.naturalWidth * scale;
                    let idleH = idleSprite.naturalHeight * scale;
                    let idleX = (screenWidth - idleW) / 2;

                    if (spriteName.startsWith('BLPS')) {
                        ctx.drawImage(idleSprite, 0, 0, idleSprite.naturalWidth / 2, idleSprite.naturalHeight, idleX, drawY, idleW / 2, idleH);
                        ctx.drawImage(currentSprite, screenWidth - drawWidth - 40, drawY, drawWidth, drawHeight);
                    } else if (spriteName.startsWith('LLPS')) {
                        ctx.drawImage(idleSprite, idleSprite.naturalWidth / 2, 0, idleSprite.naturalWidth / 2, idleSprite.naturalHeight, idleX + idleW / 2, drawY, idleW / 2, idleH);
                        ctx.drawImage(currentSprite, 40, drawY, drawWidth, drawHeight);
                    } else {
                        ctx.drawImage(currentSprite, centerX, drawY, drawWidth, drawHeight);
                    }
                }
            } else if (player.currentWeapon === 'knife') {
                let currentKnifeFrame = 0;
                if (gunAnim > 0) {
                    let step = Math.floor((16 - gunAnim) / 2.6); 
                    if (step > 5) step = 5;
                    currentKnifeFrame = step;
                }

                let activeFramesArray = (currentKnifeAttackType === 'swing') ? knifeSwingFrames : knifeFrames;
                let currentSprite = activeFramesArray[currentKnifeFrame] || activeFramesArray[0];
                
                if (currentSprite && currentSprite.complete && currentSprite.naturalWidth > 0) {
                    let scale = 1.4; 
                    let drawWidth = currentSprite.naturalWidth * scale;
                    let drawHeight = currentSprite.naturalHeight * scale;
                    let drawY = Math.floor(viewportHeight - drawHeight - 0 + gunYOffset);

                    ctx.save();
                    ctx.translate(screenWidth, 0);
                    ctx.scale(-1, 1);
                    let centerX = (screenWidth - drawWidth) / 2 - 80;
                    ctx.drawImage(currentSprite, centerX, drawY, drawWidth, drawHeight);
                    ctx.restore();
                }
            }

            /* --- SCREEN EFFECTS & HUD --- */
            for (let i = bloodSplats.length - 1; i >= 0; i--) {
                let p = bloodSplats[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.5;
                p.life--;

                let alpha = p.life / p.maxLife;
                ctx.fillStyle = `rgba(180, 0, 0, ${alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                if (p.life <= 0) bloodSplats.splice(i, 1);
            }

            if (damageFlash > 0) {
                ctx.fillStyle = `rgba(220, 0, 0, ${Math.min(0.65, damageFlash * 0.04)})`;
                ctx.fillRect(0, 0, screenWidth, viewportHeight);
                damageFlash--;
            }

            if (!isDead && backStalkWarning) {
                let pulse = (Math.sin(Date.now() / 120) + 1) * 0.5;
                ctx.strokeStyle = `rgba(160, 0, 0, ${0.3 + pulse * 0.45})`;
                ctx.lineWidth = 14;
                ctx.strokeRect(0, 0, screenWidth, viewportHeight);
            }

            ctx.restore();

            if (!isDead) {
                ctx.fillStyle = "rgba(0, 255, 0, 0.7)";
                ctx.fillRect(screenWidth / 2 - 2, viewportHeight / 2 - 1, 4, 2);
                ctx.fillRect(screenWidth / 2 - 1, viewportHeight / 2 - 2, 2, 4);
            }

            if (isDead) {
                ctx.fillStyle = "rgba(30, 0, 0, 0.65)";
                ctx.fillRect(0, 0, screenWidth, viewportHeight);

                ctx.strokeStyle = "rgba(180, 0, 0, 0.8)";
                ctx.lineWidth = 4;
                ctx.strokeRect(6, 6, screenWidth - 12, viewportHeight - 12);

                ctx.textAlign = "center";
                ctx.font = "900 52px 'Impact', 'Arial Black', sans-serif";

                ctx.fillStyle = "#000000";
                ctx.fillText("YOU DIED", screenWidth / 2 + 3, viewportHeight / 2 - 35 + 3);

                let textGrad = ctx.createLinearGradient(0, viewportHeight / 2 - 70, 0, viewportHeight / 2 - 15);
                textGrad.addColorStop(0, "#ff4444");
                textGrad.addColorStop(0.6, "#aa0000");
                textGrad.addColorStop(1.0, "#330000");
                ctx.fillStyle = textGrad;
                ctx.fillText("YOU DIED", screenWidth / 2, viewportHeight / 2 - 35);

                ctx.font = "bold 16px 'Courier New', monospace";
                ctx.fillStyle = "#ffcc00";
                ctx.fillText(`TOTAL FRAGS: ${kills}`, screenWidth / 2, viewportHeight / 2 + 15);

                let secondsLeft = Math.ceil(deathTimer / 35);
                ctx.font = "bold 14px 'Tahoma', sans-serif";
                ctx.fillStyle = (deathTimer % 10 < 5) ? "#ffffff" : "#ff5555";
                ctx.fillText(`RESTARTING IN ${secondsLeft}...`, screenWidth / 2, viewportHeight / 2 + 50);

                ctx.textAlign = "start";
            }

            ctx.fillStyle = "#333333";
            ctx.fillRect(0, viewportHeight, screenWidth, screenHeight - viewportHeight);
            ctx.fillStyle = "#0c0c0c";
            ctx.fillRect(6, viewportHeight + 6, screenWidth - 12, screenHeight - viewportHeight - 12);

            ctx.font = "24px 'VT323', monospace";
            ctx.fillStyle = "#888";
            ctx.fillText("HEALTH", 40, viewportHeight + 28);
            ctx.fillText("TIME", 210, viewportHeight + 28);

            ctx.font = "16px 'VT323', monospace";
            ctx.fillText("FRAGS", 270, viewportHeight + 52);

            ctx.font = "24px 'VT323', monospace";
            ctx.fillText("WEAPON", 450, viewportHeight + 28);
            ctx.fillText("AMMO", 600, viewportHeight + 28);

            ctx.font = "46px 'VT323', monospace";

            if (hpFlashTimer > 0) {
                ctx.fillStyle = (hpFlashTimer % 6 < 3) ? "#00ff66" : "#ffffff";
            } else {
                ctx.fillStyle = (player.health <= 35) ? "#ff0000" : "#cc0000";
            }
            ctx.fillText(player.health + "%", 40, viewportHeight + 72);

            let tColor = "#ffffff";
            let blink = true;
            if (player.timeLeft <= 10) {
                blink = Math.floor(Date.now() / 150) % 2 === 0;
                tColor = "#ff0000";
            } else if (player.timeLeft <= 20) {
                blink = Math.floor(Date.now() / 300) % 2 === 0;
                tColor = "#ffaa00";
            }
            if (blink) {
                ctx.fillStyle = tColor;
                ctx.fillText(Math.ceil(player.timeLeft), 210, viewportHeight + 72);
            }

            ctx.fillStyle = "#00ff00";
            ctx.font = "24px 'VT323', monospace";
            ctx.fillText(kills, 280, viewportHeight + 72);

            ctx.font = "46px 'VT323', monospace";
            if (ammoFlashTimer > 0) {
                ctx.fillStyle = (ammoFlashTimer % 6 < 3) ? "#ffff55" : "#ffffff";
            } else {
                ctx.fillStyle = "#ffcc00";
            }
            ctx.fillText(player.ammo, 600, viewportHeight + 72);

            let wIcon = (player.currentWeapon === 'pistols') ? hudWeapons.pistols : hudWeapons.knife;
            if (wIcon && wIcon.complete && wIcon.naturalWidth > 0) {
                let iScale = 65 / Math.max(wIcon.naturalWidth, wIcon.naturalHeight);
                let iW = wIcon.naturalWidth * iScale;
                let iH = wIcon.naturalHeight * iScale;
                ctx.drawImage(wIcon, 475 - iW / 2, viewportHeight + 35, iW, iH);
            }

            let faceBoxX = screenWidth / 2 - 36;
            let faceBoxY = viewportHeight + 12;
            
            ctx.fillStyle = "#222222"; 
            ctx.fillRect(faceBoxX, faceBoxY, 72, 78);
            ctx.strokeStyle = isDead ? "#990000" : ((damageFlash > 0 || backStalkWarning) ? "#cc0000" : "#555");
            ctx.lineWidth = 2;
            ctx.strokeRect(faceBoxX, faceBoxY, 72, 78);

            let faceImageName = 'guy24.png';

            if (!isDead) {
                let hpState = 0;
                if (player.health < 20) hpState = 4;
                else if (player.health < 40) hpState = 3;
                else if (player.health < 60) hpState = 2;
                else if (player.health < 80) hpState = 1;
                else hpState = 0;

                let isAction = (faceAnimTimer > 0 || playerInvulnTimer > 0); 

                let idleSets = [
                    ['guy1.png', 'guy2.png', 'guy3.png'],
                    ['guy5.png', 'guy6.png', 'guy7.png'],
                    ['guy9.png', 'guy10.png', 'guy11.png'],
                    ['guy13.png', 'guy14.png', 'guy15.png'],
                    ['guy17.png', 'guy18.png', 'guy19.png']
                ];
                
                let actionFaces = ['guy21.png', 'guy21.png', 'guy22.png', 'guy23.png', 'guy24.png'];
                let dirIndex = gazeDirection + 1; 

                if (isAction) {
                    faceImageName = actionFaces[hpState];
                } else {
                    faceImageName = idleSets[hpState][dirIndex];
                }
            }

            let faceImg = faceFrames[faceImageName];
            if (faceImg && faceImg.complete && faceImg.naturalWidth > 0) {
                ctx.drawImage(faceImg, faceBoxX + 6, faceBoxY + 4, 64, 70);
            } else {
                ctx.fillStyle = "#000";
                ctx.fillRect(faceBoxX + 6, faceBoxY + 4, 64, 70);
            }

            /* --- MINIMAP --- */
            const miniCanvas = document.getElementById('minimapCanvas');
            if (showMinimap) {
                miniCanvas.style.display = 'block';
                const mCtx = miniCanvas.getContext('2d');
                mCtx.clearRect(0, 0, 180, 180);
                
                let tileSize = 180 / Math.max(map[0].length, map.length);
                
                mCtx.fillStyle = '#444';
                for (let y = 0; y < map.length; y++) {
                    for (let x = 0; x < map[0].length; x++) {
                        if (map[y][x] > 0) mCtx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
                    }
                }
                
                mCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                mCtx.beginPath();
                mCtx.moveTo(player.x * tileSize, player.y * tileSize);
                mCtx.arc(player.x * tileSize, player.y * tileSize, 10 * tileSize, player.angle - halfFov, player.angle + halfFov);
                mCtx.fill();

                mCtx.fillStyle = '#00ff00';
                mCtx.fillRect(player.x * tileSize - 2, player.y * tileSize - 2, 4, 4);
                
                enemies.forEach(en => {
                    if (en.state === 'alive') {
                        let diffAngle = Math.atan2(en.y - player.y, en.x - player.x) - player.angle;
                        while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
                        while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;

                        let inFOV = Math.abs(diffAngle) < halfFov && hasLineOfSight(player.x, player.y, en.x, en.y);
                        
                        if (showAllMonsters || inFOV) {
                            mCtx.fillStyle = inFOV ? '#ff0000' : '#880000';
                            mCtx.fillRect(en.x * tileSize - 1.5, en.y * tileSize - 1.5, 3, 3);
                        }
                    }
                });
            } else {
                miniCanvas.style.display = 'none';
            }
        } 
        if (updates >= 4) accumulator = 0; 
    }

    requestAnimationFrame(gameLoop); 
}


/* ==========================================================================
   SYSTEM SOUNDS, TABS & UI NAVIGATION
   ========================================================================== */

const CLICK_SRC = 'resorse/sounds/Akvariume.mp3';
const STOP_SRC = 'resorse/sounds/ErorreSong.mp3';

const CLICK_VOLUME = 0.2;
const SYSTEM_VOLUME = 0.4; 

function playSound(src, volume = CLICK_VOLUME) {
    const sound = new Audio(src);
    sound.volume = volume;
    sound.play().catch(() => {});
}

document.addEventListener('pointerdown', function(e) {
    if (e.target.closest('.win-btn, .taskbar-start')) {
        playSound(STOP_SRC, SYSTEM_VOLUME);
    }
    else if (e.target.closest('.button, button, #donntu a')) {
        playSound(CLICK_SRC, CLICK_VOLUME);
    }
});

function toggleMugshotBubble(event) {
    event.stopPropagation();
    
    const bubble = document.getElementById('mugshot-bubble');
    if (!bubble) return;

    if (bubble.style.display === 'none' || !bubble.style.display) {
        bubble.style.display = 'block';
        setTimeout(() => {
            bubble.style.display = 'none';
        }, 6000);
    } else {
        bubble.style.display = 'none';
    }
}

function switchTab(hash) {
    const targetId = (hash && hash !== '#') ? hash.replace('#', '') : 'about';
    const targetSection = document.getElementById(targetId);

    if (!targetSection) {
        if (targetId !== 'about') switchTab('#about');
        return;
    }

    const currentActive = document.querySelector('.tab-content.active');
    if (currentActive === targetSection) return;

    const allLinks = document.querySelectorAll('.tab-link');
    allLinks.forEach(link => {
        link.classList.remove('colorfix');
        link.classList.add('color');
    });
    
    const activeLinks = document.querySelectorAll(`.tab-link[href="#${targetId}"]`);
    activeLinks.forEach(link => {
        link.classList.add('colorfix');
        link.classList.remove('color');
    });

    const allSections = document.querySelectorAll('.tab-content');
    allSections.forEach(sec => {
        sec.classList.remove('active', 'tab-leaving');
    });

    targetSection.classList.add('active');

    const lazyImages = targetSection.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => {
        if (!img.src || img.src === window.location.href) {
            img.src = img.getAttribute('data-src');
        }
    });

    const referatFrame = document.getElementById('referat-frame');
    if (referatFrame) {
        if (targetId === 'referat') {
            const pdfUrl = referatFrame.getAttribute('data-src');
            if (pdfUrl && !referatFrame.src.endsWith(pdfUrl)) {
                referatFrame.src = pdfUrl;
            }
        } else {
            referatFrame.src = 'about:blank';
        }
    }
}

function loadDocFrame(fileName) {
    const viewerSection = document.getElementById('pdf-viewer-section');
    const frame = document.getElementById('doc-frame');
    const title = document.getElementById('pdf-viewer-title');
    const basePath = 'resorse/pdf/';
    
    if (viewerSection && frame) {
        viewerSection.style.display = 'block';
        frame.src = basePath + fileName;
        if (title) title.innerText = 'Просмотр документа: ' + fileName;
        viewerSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function closeDocFrame() {
    const viewerSection = document.getElementById('pdf-viewer-section');
    const frame = document.getElementById('doc-frame');
    if (viewerSection && frame) {
        frame.src = 'about:blank';
        viewerSection.style.display = 'none';
    }
}

window.addEventListener('hashchange', function() {
    switchTab(window.location.hash);
});

window.addEventListener('DOMContentLoaded', function() {
    const bg = document.querySelector('.background-image');
    if (bg && bg.getAttribute('data-src')) {
        bg.src = bg.getAttribute('data-src');
    }

    const tabButtons = document.querySelectorAll('.tab-link');
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const targetHash = this.getAttribute('href');
            history.pushState(null, '', targetHash);
            switchTab(targetHash);
        });
    });

    switchTab(window.location.hash);
});



/* ==========================================================================
   WINDOWS 95 BOOT SEQUENCE, WINDOW ANIMATIONS & CRT POWER CONTROL
   ========================================================================== */

const BOOT_GIF_SRC = 'resorse/images/gif/win95_boot.gif';
const STARTUP_SOUND_SRC = 'resorse/sounds/wim95.mp3';

let bootSequenceCompleted = false;
let currentBootAudio = null;
let bootFallbackTimer = null;

function prepareDesktopForBoot() {
    const taskbar = document.getElementById('topblock');
    const windows = [
        document.getElementById('header'),
        document.getElementById('desktop-snake-window'),
        document.getElementById('middleblock'),
        document.getElementById('contacts-window'),
        document.getElementById('weather-window')
    ];

    if (taskbar) {
        taskbar.classList.remove('taskbar-visible');
        taskbar.classList.add('desktop-boot-hidden');
    }

    windows.forEach(win => {
        if (win) {
            win.classList.remove('win-open-anim');
            win.classList.add('desktop-boot-hidden');
        }
    });
}

function revealDesktopWindows() {
    const taskbar = document.getElementById('topblock');
    const windows = [
        document.getElementById('header'),
        document.getElementById('desktop-snake-window'),
        document.getElementById('middleblock'),
        document.getElementById('contacts-window'),
        document.getElementById('weather-window')
    ];

    setTimeout(() => {
        if (taskbar) {
            taskbar.classList.remove('desktop-boot-hidden');
            taskbar.classList.add('taskbar-visible');
        }
    }, 450);

    windows.forEach((win, index) => {
        if (!win) return;
        setTimeout(() => {
            win.classList.remove('desktop-boot-hidden');
            void win.offsetWidth;
            win.classList.add('win-open-anim');
        }, 700 + index * 160);
    });
}

function finishBootSequence() {
    if (bootSequenceCompleted) return;
    bootSequenceCompleted = true;

    if (bootFallbackTimer) {
        clearTimeout(bootFallbackTimer);
        bootFallbackTimer = null;
    }

    if (currentBootAudio) {
        currentBootAudio.pause();
        currentBootAudio.currentTime = 0;
        currentBootAudio = null;
    }

    const bootScreen = document.getElementById('win95-boot-screen');
    const bootGif = document.getElementById('win95-boot-gif');

    if (bootScreen) {
        bootScreen.classList.add('boot-fade-out');
        setTimeout(() => {
            bootScreen.style.display = 'none';
            bootScreen.classList.remove('boot-fade-out');
            if (bootGif) bootGif.src = '';
        }, 350);
    }

    revealDesktopWindows();
}

function startBootSequence() {
    bootSequenceCompleted = false;
    prepareDesktopForBoot();

    const bootScreen = document.getElementById('win95-boot-screen');
    const bootGif = document.getElementById('win95-boot-gif');

    if (!bootScreen) {
        revealDesktopWindows();
        return;
    }

    // Перезапускаем GIF с первого кадра через уникальный параметр
    if (bootGif) {
        bootGif.src = `${BOOT_GIF_SRC}?t=${Date.now()}`;
    }

    bootScreen.style.display = 'flex';
    bootScreen.classList.remove('boot-fade-out');

    // Запускаем звук параллельно с GIF и завершаем заставку по событию ended
    currentBootAudio = new Audio(STARTUP_SOUND_SRC);
    currentBootAudio.volume = 0.6;

    currentBootAudio.onended = () => finishBootSequence();
    currentBootAudio.onerror = () => finishBootSequence();

    // Страховочный таймер на случай, если звук не загрузится или заблокирован
    bootFallbackTimer = setTimeout(() => {
        finishBootSequence();
    }, 8000);

    currentBootAudio.play().catch(() => {
        // Если автовоспроизведение звука заблокировано, закрываем через 3.5 сек
        clearTimeout(bootFallbackTimer);
        bootFallbackTimer = setTimeout(() => finishBootSequence(), 3500);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    prepareDesktopForBoot();
    revealDesktopWindows();
});

function toggleStartMenu(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('win-start-menu');
    if (!menu) return;
    menu.style.display = (menu.style.display === 'none' || !menu.style.display) ? 'flex' : 'none';
}

document.addEventListener('pointerdown', function(e) {
    const menu = document.getElementById('win-start-menu');
    if (menu && menu.style.display === 'flex') {
        if (!e.target.closest('#win-start-menu') && !e.target.closest('.taskbar-start')) {
            menu.style.display = 'none';
        }
    }
});

function shutdownPC() {
    const menu = document.getElementById('win-start-menu');
    const overlay = document.getElementById('crt-shutdown-overlay');
    if (menu) menu.style.display = 'none';
    if (!overlay) return;

    if (typeof closeDoomEasterEgg === 'function') closeDoomEasterEgg();
    if (typeof closeDoomGuide === 'function') closeDoomGuide();

    overlay.classList.remove('is-off');
    overlay.style.display = 'flex';
    void overlay.offsetWidth;
    overlay.classList.add('shutting-down');

    setTimeout(() => {
        overlay.classList.remove('shutting-down');
        overlay.classList.add('is-off');
        prepareDesktopForBoot();
    }, 650);
}

function powerOnPC() {
    const overlay = document.getElementById('crt-shutdown-overlay');
    if (!overlay) return;

    playSound(CLICK_SRC, SYSTEM_VOLUME);
    overlay.classList.remove('is-off', 'shutting-down');
    overlay.style.display = 'none';

    startBootSequence();
}