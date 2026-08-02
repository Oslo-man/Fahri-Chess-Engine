// =====================================================
// index3.js
// Logika utama aplikasi Puzzle Kustom
// Membutuhkan puzzle.js dimuat sebelum file ini
// (menyediakan variabel global: puzzle, DAILY_puzzle)
// =====================================================

        // =====================================================
        // PIECE SVG DEFINITIONS (Wikimedia Commons Style)
        // =====================================================
        const PIECE_SVG = {
            'wK': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.63V6M20 8h5"/><path fill="#fff" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#fff" d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7"/><path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0"/></g></svg>`,
            'wQ': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/><path stroke-linecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L6 14l3 12z"/><path stroke-linecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path fill="none" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/></g></svg>`,
            'wR': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linecap="butt" d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5"/><path d="M34 14l-3 3H14l-3-3"/><path stroke-linecap="butt" stroke-linejoin="miter" d="M31 17v12.5H14V17"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path fill="none" stroke-linejoin="miter" d="M11 14h23"/></g></svg>`,
            'wB': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>`,
            'wN': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#fff" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#fff" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><path fill="#000" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zM14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z"/></g></svg>`,
            'wP': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></svg>`,
            'bK': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.63V6M20 8h5"/><path fill="#000" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#000" d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-2.5-7.5-12-10.5-16-4-3 6 6 10.5 6 10.5v7"/><path stroke="#fff" stroke-width="1.5" d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0"/><path fill="none" stroke="#fff" stroke-width="1" d="M20.5 25s3-5 2.5-8.5M24.5 25s-3-5-2.5-8.5"/></g></svg>`,
            'bQ': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#000" stroke="none"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path fill="#000" stroke-linecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"/><path fill="#000" stroke-linecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path fill="none" stroke="#fff" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/></g></svg>`,
            'bR': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#000" stroke-linecap="butt" d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z"/><path fill="#000" stroke-linecap="butt" stroke-linejoin="miter" d="M14 29.5v-13h17v13H14z"/><path fill="#000" stroke-linecap="butt" d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z"/><path fill="none" stroke="#fff" stroke-linejoin="miter" stroke-width="1" d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17M11 14h23"/></g></svg>`,
            'bB': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#000" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke="#fff" stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>`,
            'bN': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#000" stroke="#333" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#000" stroke="#333" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><circle cx="9" cy="25.5" r="1.5" fill="#fff"/><ellipse cx="14.5" cy="15.5" rx="1.5" ry="3" fill="#fff" transform="rotate(30 14.5 15.5)"/><path fill="none" stroke="#555" stroke-width="1" d="M25 10.5c4 1 7 3 9 7M27 14c2 1 4 3 5 6"/></g></svg>`,
            'bP': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000" stroke="#333" stroke-width="1.5" stroke-linecap="round"/></svg>`
        };

        // =====================================================
        // CONSTANTS
        // =====================================================
        const ANIMATION = {
            DEFAULT_DURATION: 300,
            REVIEW_DURATION: 300,
            SHAKE_DURATION: 400,
            PULSE_DURATION: 300,
            OPPONENT_DELAY: 150,
            INITIAL_MOVE_DURATION: 0,
            END_GAME_DELAY: 3000,
            ALERT_AUTO_CLOSE: 3000
        };
        
        const TIMER_THRESHOLDS = {
            WARNING: 30,
            CRITICAL: 10
        };
        
        const DRAG_SCALE = 0.9;     // Drag piece size relative to square
        const PIECE_SCALE = 0.85;    // Static piece size relative to square
        const HIGHSCORE_MAX = 100;   // Max stored highscores

// =====================================================
// INTERNATIONALIZATION (PP_36)
// =====================================================
const LANG = {
    id: {
        // Page title & errors
        pageTitle: 'puzzle kustom | Latihan Catur',
        engineLoadError: 'Mesin catur (chess.js) gagal dimuat.',
        checkConnection: 'Periksa koneksi internet kamu dan muat ulang halaman.',
        reload: 'Muat Ulang',
        // Settings
        settings: 'Pengaturan',
        dailyPuzzle: 'Puzzle Harian',
        timeLimit: 'Batas Waktu',
        minute1: '1 Menit',
        minutes3: '3 Menit',
        minutes5: '5 Menit',
        minutes10: '10 Menit',
        unlimited: 'Tidak Terbatas',
        minutesUnit: 'Menit',
        startRating: 'Rating Awal',
        veryEasy: 'Sangat Mudah (~600)',
        easy: 'Mudah (~1000)',
        medium: 'Sedang (~1400)',
        advanced: 'Lanjutan (~1800)',
        hard: 'Sulit (~2200)',
        veryHard: 'Sangat Sulit (~2600)',
        insane: 'Tersulit (~3000)',
        mistakes: 'Kesalahan',
        mistake1: '1 Kesalahan',
        mistakes3: '3 Kesalahan',
        mistakes5: '5 Kesalahan',
        mistakesUnit: 'Kesalahan',
        increasePerPuzzle: 'Kenaikan per Puzzle',
        none: 'Tidak Ada',
        slow: 'Lambat (+10)',
        normal: 'Normal (+15)',
        fast: 'Cepat (+25)',
        veryFast: 'Sangat Cepat (+50)',
        perPuzzle: 'per Puzzle',
        themeFilter: 'Pilih Tema Puzzle',
        allThemes: 'Semua Tema',
        reset: 'Reset',
        atLeastOneTheme: 'Minimal Satu tema',
        atLeastOneThemeTooltip: 'Puzzle harus mengandung minimal satu tema yang dipilih',
        allThemesMatch: 'Semua tema',
        allThemesMatchTooltip: 'Puzzle harus mengandung semua tema yang dipilih',
        sound: 'Suara',
        soundMoves: 'Gerakan',
        soundEffects: 'Efek Suara',
        soundAllOn: 'Semua Aktif',
        soundOff: 'Mati',
        advancedSettings: 'Pengaturan Lain',
        bonusTimePerMove: 'Bonus Waktu per Langkah',
        second1: '1 Detik',
        seconds2: '2 Detik',
        seconds3: '3 Detik',
        seconds5: '5 Detik',
        secondsUnit: 'Detik',
        onMistake: 'Saat Salah',
        tryAgain: 'Coba Lagi',
        nextPuzzle: 'Puzzle Berikutnya',
        showHints: 'Tampilkan Petunjuk',
        hintsThemes: 'tema',
        hintsPiece: 'Bidak',
        hintsAll: 'Semua',
        hintsNone: 'Tidak Ada',
        colorChoice: 'Pilihan Warna',
        colorMixed: 'Campuran',
        colorWhite: 'Putih',
        colorBlack: 'Hitam',
        colorRandom: 'Acak',
        showRating: 'Tampilkan Rating',
        on: 'Aktif',
        off: 'Nonaktif',
        pieceCount: 'Jumlah Bidak',
        startGame: 'Mulai Permainan',
        // Game screen
        time: 'Waktu',
        solved: 'Terpecahkan',
        mistakesLabel: 'Kesalahan',
        rating: 'Rating',
        puzzleProgress: 'Progres Puzzle',
        findBestMove: 'Temukan langkah terbaik!',
        moveInputPlaceholder: 'Masukkan langkah (mis. Nf3)',
        continue_: 'Lanjut',
        themesHintBtn: 'Tentang tema',
        showPieceBtn: 'Petunjuk',
        endGame: 'Akhiri Permainan',
        // Feedback
        solvedMsg: '\u2713 Terpecahkan!',
        wrongMsg: '\u2717 Salah!',
        wrongTryAgainMsg: '\u2717 Salah! Coba lagi.',
        checkmateMsg: 'Skakmat!',
        drawMsg: 'Remis!',
        yourMove: 'Giliranmu...',
        invalidMove: 'Langkah tidak valid',
        invalidMoveWith: 'Langkah tidak valid: ',
        invalidPuzzle: 'Puzzle tidak valid',
        invalidPosition: 'Posisi tidak valid',
        allpuzzlePlayed: 'Semua puzzle dengan filter ini sudah dimainkan',
        nopuzzleForFilter: 'Tidak ada puzzle untuk filter ini',
        errorLoadingpuzzle: 'Gagal memuat puzzle',
        // Game over
        gameOver: 'Permainan Selesai!',
        puzzleSolved: 'puzzle terpecahkan',
        highestRating: 'Rating Tertinggi: ~',
        reviewpuzzle: 'Lihat hasil',
        playAgain: 'Main Lagi',
        firstHighScore: 'Skor Tertinggi Pertama!',
        newHighScore: 'Skor Tertinggi Baru!',
        before: 'Sebelum',
        new_: 'Baru',
        now: 'Sekarang',
        highScore: 'Skor Tertinggi',
        highScoreForSettings: 'Skor tertinggi untuk pengaturan ini',
        solvedCount: 'terpecahkan',
        // Daily puzzle
        dailySolved: 'Terpecahkan!',
        dailyUnsolved: 'Belum Terpecahkan',
        dailyThemes: 'Tema: ',
        dailyTime: 'Waktu: ',
        dailyMistakes: 'Kesalahan: ',
        dailyFirstTry: 'Percobaan pertama!',
        viewSolution: 'Lihat Solusi',
        morepuzzle: 'Lebih banyak puzzle!',
        // Review screen
        puzzleOverview: 'hasil Puzzle',
        total: 'Total:',
        reviewSolved: 'Terpecahkan:',
        reviewUnsolved: 'Belum Terpecahkan:',
        filterAll: 'Semua',
        byNumber: 'Berdasarkan Nomor',
        byRating: 'Berdasarkan Rating',
        byTime: 'Berdasarkan Waktu',
        byAttempts: 'Berdasarkan Percobaan',
        gridView: 'Tampilan Grid',
        listView: 'Tampilan Daftar',
        nopuzzleFound: 'Tidak ada puzzle ditemukan',
        attempts0: '0 Percobaan',
        attempt1: '1 Percobaan',
        attemptsN: 'Percobaan',
        // Review detail
        reviewSolvedStatus: 'Terpecahkan',
        reviewUnsolvedStatus: 'Belum Terpecahkan',
        goToStart: 'Ke Awal',
        back: 'Kembali',
        forward: 'Maju',
        goToEnd: 'Ke Akhir',
        play: 'Putar',
        retry: 'Coba Lagi',
        solution: 'Solusi',
        analysis: 'Analisis',
        attemptsLabel: 'Percobaan:',
        timeLabel: 'Waktu:',
        ratingLabel: 'Rating:',
        themesLabel: 'Tema:',
        puzzleOnLichess: 'Puzzle di Lichess \u2197',
        previous: '\u2190 Sebelumnya',
        next: 'Berikutnya \u2192',
        done: 'Selesai!',
        // Theme hints
        puzzleThemesTitle: 'tema puzzle ini',
        noThemesAvailable: 'Tidak ada tema tersedia',
        movesSingular: 'Langkah',
        movesPlural: 'Langkah',
        // Stockfish
        loadingStockfish: 'Memuat Stockfish...',
        stockfishError: 'Error Stockfish',
        stockfishUnavailable: 'Stockfish tidak tersedia (offline?)',
        analyzing: 'Menganalisis...',
        // Theme categories
        catGamePhases: 'Fase Permainan',
        catCommontemas: 'tema Umum',
        catRaretemas: 'tema Langka',
        catCheckmateGoals: 'Tujuan Skakmat',
        catCheckmatePatterns: 'Pola Skakmat',
        catSpecialMoves: 'Langkah Khusus',
        catLength: 'Panjang',
        catYouthTraining: 'Latihan Pemuda',
        // Theme labels
        themeOpening: 'Pembukaan',
        themeMiddlegame: 'Permainan Tengah',
        themeEndgame: 'Akhir Permainan',
        themeRookEndgame: 'Akhir Permainan Benteng',
        themeBishopEndgame: 'Akhir Permainan Gajah',
        themePawnEndgame: 'Akhir Permainan Pion',
        themeKnightEndgame: 'Akhir Permainan Kuda',
        themeQueenEndgame: 'Akhir Permainan Ratu',
        themeFork: 'Garpu (Serangan Ganda)',
        themeKingsideAttack: 'Serangan Sayap Raja',
        themeSacrifice: 'Pengorbanan',
        themePin: 'Tusukan (Pin)',
        themeAdvancedPawn: 'Pion Maju',
        themeDefensiveMove: 'Langkah Bertahan',
        themeDiscoveredAttack: 'Serangan Tembus',
        themeDeflection: 'Pengalihan',
        themeQuietMove: 'Langkah Senyap',
        themeHangingPiece: 'Bidak Menggantung',
        themeAttraction: 'Penarik',
        themeExposedKing: 'Raja Terbuka',
        themeSkewer: 'Tusuk Sate (Skewer)',
        themeDiscoveredCheck: 'Skak Tembus',
        themeQueensideAttack: 'Serangan Sayap Ratu',
        themeClearance: 'Pembersihan Jalur',
        themeIntermezzo: 'Langkah Antara (Zwischenzug)',
        themeTrappedPiece: 'Bidak Terjebak',
        themeZugzwang: 'Zugzwang',
        themeAttackingF2F7: 'Serangan ke f2/f7',
        themeCapturingDefender: 'Eliminasi Pembela',
        themeDoubleCheck: 'Skak Ganda',
        themeInterference: 'Interupsi',
        themeXRayAttack: 'Serangan X-Ray',
        themeMate: 'Skakmat',
        themeMateIn1: 'Mat dalam 1',
        themeMateIn2: 'Mat dalam 2',
        themeMateIn3: 'Mat dalam 3',
        themeMateIn4: 'Mat dalam 4',
        themeMateIn5: 'Mat dalam 5+',
        themeBackRankMate: 'Mat Baris Belakang',
        themeRookBishopMate: 'Mat Benteng+Gajah',
        themeRookKnightMate: 'Mat Benteng+Kuda',
        themeSmotheredMate: 'Mat Tercekik',
        themeQueenRookMate: 'Mat Ratu+Benteng',
        themeDoubleBishopMate: 'Mat Gajah+Gajah',
        themeDoubleRookMate: 'Mat Benteng+Benteng',
        themeQueenMate: 'Mat Ratu',
        themeQueenBishopMate: 'Mat Ratu+Gajah',
        themeEnPassant: 'En Passant',
        themePromotion: 'Promosi Pion',
        themeUnderPromotion: 'Promosi Bawah',
        themeOneMove: 'Satu Langkah',
        themeShort: '2 Langkah',
        themeLong: '3 Langkah',
        themeVeryLong: '4+ Langkah',
        themeStufe1: 'Level 1 (400-900)',
        themeStufe2: 'Level 2 (900-1400)',
        themeStufe3: 'Level 3 (1400-1900)',
        themeStufe4: 'Level 4 (1900-2400)',
        themeStufe5: 'Level 5 (2400-2900)'
    }
};

const currentLang = 'id';

function t(key) { return LANG.id[key] || key; }

function applyLanguage() {
    document.documentElement.lang = 'id';
    document.title = t('pageTitle');
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
        el.title = t(el.dataset.i18nTitle);
    });
    document.querySelectorAll('option[data-i18n]').forEach(function(el) {
        el.textContent = t(el.dataset.i18n);
    });
    // Re-render dynamic displays
    if (typeof updateSoundDisplay === 'function') updateSoundDisplay();
    if (typeof updateTipsDisplay === 'function') updateTipsDisplay();
    if (typeof updateThemeFilterDisplay === 'function') updateThemeFilterDisplay();
    if (typeof updatePieceCountDisplay === 'function') updatePieceCountDisplay();
    // Re-render daily link text
    if (typeof initDailyCard === 'function') initDailyCard();
    // Re-build theme filter checkboxes
    if (typeof buildThemeFilter === 'function') buildThemeFilter();
}

        // =====================================================
        // PUZZLE THEMES (dynamic, language-aware)
        // =====================================================
        // Internal category keys for language-independent checks
        var THEME_CATEGORY_KEYS = [
            'catGamePhases', 'catCommontemas', 'catRaretemas',
            'catCheckmateGoals', 'catCheckmatePatterns', 'catSpecialMoves',
            'catLength', 'catYouthTraining'
        ];

        function getPuzzleThemes() {
            return {
                [t('catGamePhases')]: {
                    'opening': t('themeOpening'),
                    'middlegame': t('themeMiddlegame'),
                    'endgame': t('themeEndgame'),
                    'rookEndgame': t('themeRookEndgame'),
                    'bishopEndgame': t('themeBishopEndgame'),
                    'pawnEndgame': t('themePawnEndgame'),
                    'knightEndgame': t('themeKnightEndgame'),
                    'queenEndgame': t('themeQueenEndgame')
                },
                [t('catCommontemas')]: {
                    'fork': t('themeFork'),
                    'kingsideAttack': t('themeKingsideAttack'),
                    'sacrifice': t('themeSacrifice'),
                    'pin': t('themePin'),
                    'advancedPawn': t('themeAdvancedPawn'),
                    'defensiveMove': t('themeDefensiveMove'),
                    'discoveredAttack': t('themeDiscoveredAttack'),
                    'deflection': t('themeDeflection'),
                    'quietMove': t('themeQuietMove'),
                    'hangingPiece': t('themeHangingPiece'),
                    'attraction': t('themeAttraction'),
                    'exposedKing': t('themeExposedKing'),
                    'skewer': t('themeSkewer'),
                    'discoveredCheck': t('themeDiscoveredCheck')
                },
                [t('catRaretemas')]: {
                    'queensideAttack': t('themeQueensideAttack'),
                    'clearance': t('themeClearance'),
                    'intermezzo': t('themeIntermezzo'),
                    'trappedPiece': t('themeTrappedPiece'),
                    'zugzwang': t('themeZugzwang'),
                    'attackingF2F7': t('themeAttackingF2F7'),
                    'capturingDefender': t('themeCapturingDefender'),
                    'doubleCheck': t('themeDoubleCheck'),
                    'interference': t('themeInterference'),
                    'xRayAttack': t('themeXRayAttack')
                },
                [t('catCheckmateGoals')]: {
                    'mate': t('themeMate'),
                    'mateIn1': t('themeMateIn1'),
                    'mateIn2': t('themeMateIn2'),
                    'mateIn3': t('themeMateIn3'),
                    'mateIn4': t('themeMateIn4'),
                    'mateIn5': t('themeMateIn5')
                },
                [t('catCheckmatePatterns')]: {
                    'backRankMate': t('themeBackRankMate'),
                    'rookBishopMate': t('themeRookBishopMate'),
                    'rookKnightMate': t('themeRookKnightMate'),
                    'smotheredMate': t('themeSmotheredMate'),
                    'queenRookMate': t('themeQueenRookMate'),
                    'doubleBishopMate': t('themeDoubleBishopMate'),
                    'doubleRookMate': t('themeDoubleRookMate'),
                    'queenMate': t('themeQueenMate'),
                    'queenBishopMate': t('themeQueenBishopMate')
                },
                [t('catSpecialMoves')]: {
                    'enPassant': t('themeEnPassant'),
                    'promotion': t('themePromotion'),
                    'underPromotion': t('themeUnderPromotion')
                },
                [t('catLength')]: {
                    'oneMove': t('themeOneMove'),
                    'short': t('themeShort'),
                    'long': t('themeLong'),
                    'veryLong': t('themeVeryLong')
                },
                [t('catYouthTraining')]: {
                    'stufe1': t('themeStufe1'),
                    'stufe2': t('themeStufe2'),
                    'stufe3': t('themeStufe3'),
                    'stufe4': t('themeStufe4'),
                    'stufe5': t('themeStufe5')
                }
            };
        }

        // Mapping for combined mate patterns
        const THEME_MAPPINGS = {
            'rookKnightMate': ['anastasiaMate', 'arabianMate', 'cornerMate', 'hookMate', 'vukovicMate'],
            'rookBishopMate': ['morphysMate', 'operaMate', 'pillsburysMate'],
            'queenRookMate': ['triangleMate', 'killBoxMate'],
            'queenBishopMate': ['balestraMate'],
            'doubleBishopMate': ['bodenMate', 'doubleBishopMate'],
            'doubleRookMate': ['blindSwineMate'],
            'queenMate': ['dovetailMate'],
            'backRankMate': ['backRankMate'],
            'smotheredMate': ['smotheredMate']
        };
        
        // Reverse mapping: Lichess-specific mate theme -> consolidated theme key
        const REVERSE_MATE_MAPPINGS = {};
        for (const [consolidated, subThemes] of Object.entries(THEME_MAPPINGS)) {
            for (const sub of subThemes) {
                REVERSE_MATE_MAPPINGS[sub.toLowerCase()] = consolidated;
            }
        }
        
        // Stufen/Jugendtraining: Cumulative themes per level
        const STUFEN_THEMES = {
            'stufe1': ['mateIn1', 'hangingPiece', 'defensiveMove', 'fork'],
            'stufe2': ['mateIn2', 'pin', 'discoveredAttack', 'capturingDefender', 'intermezzo', 'pawnEndgame'],
            'stufe3': ['doubleCheck', 'discoveredCheck', 'advancedPawn', 'kingsideAttack', 'xRayAttack', 'underPromotion'],
            'stufe4': ['mateIn3', 'interference', 'attraction', 'clearance', 'exposedKing'],
            'stufe5': ['mateIn4', 'mateIn5', 'zugzwang', 'trappedPiece', 'queensideAttack', 'veryLong', 'rookEndgame', 'pawnEndgame']
        };
        
        // Stufen rating ranges
        const STUFEN_RATINGS = {
            'stufe1': [400, 900],
            'stufe2': [900, 1400],
            'stufe3': [1400, 1900],
            'stufe4': [1900, 2400],
            'stufe5': [2400, 2900]
        };

        // =====================================================
        // REAL LICHESS puzzle
        // Format: [PuzzleId, FEN, Moves, Rating, Themes]
        // =====================================================
        // Puzzle data is loaded from puzzle.js (variables: puzzle, DAILY_puzzle)
        
        // =====================================================
        // GAME STATE
        // =====================================================
        let game = null;
        let selectedSquare = null;
        let currentPuzzle = null;
        let puzzleMoves = [];
        let moveIndex = 0;
        let playerColor = 'w';
        let solved = 0;
        let errors = 0;
        let timeLeft = 300;
        let timerInterval = null;
        let gameActive = false;
        let lastMoveFrom = null;
        let lastMoveTo = null;
        let lastMoveSoundTime = null; // shared AudioContext time of the most recent move sound, used to sync follow-up sounds (solved/wrong/timeup)
        let usedpuzzle = new Set();
        
        // Daily Puzzle mode
        let dailyMode = false;
        let dailyPuzzleId = null;
        
        // Drag and drop state

        // Promotion state
        let pendingPromotion = null; // {from, to, color}
        let pendingReviewPromotion = null; // {from, to, color} for review board
        let pendingAnalysisPromotion = null; // {from, to, color} for analysis/stockfish board
        
        // Puzzle tracking for review
        let playedpuzzle = [];
        let currentpuzzletartTime = 0;
        let currentPuzzleAttempts = 0;
        let currentPuzzleWrongMoves = [];
        let currentPuzzleUniqueErrors = new Set(); // Track unique wrong moves per puzzle
        let currentPuzzleUsedThemeHint = false;
        let currentPuzzleUsedPieceHint = false;
        
        // Performance Rating tracking
        let performanceResults = []; // {puzzleRating, solved, timeSpent, attempts, usedThemeHint, usedPieceHint}
        
        // Review state
        const reviewState = {
            filter: 'all',
            view: 'grid',
            sort: 'number',
            currentIndex: 0,
            game: null,
            moves: [],
            moveIndex: 0,
            playInterval: null,
            playerColor: 'w',
            solutionVisible: false,
            puzzleolved: false,
            selectedSquare: null,
            lastMoveFrom: null,   // letzter Gegner-Zug (grüne Markierung)
            lastMoveTo: null,
            mode: 'solution'      // 'solution' | 'analysis' | 'stockfish' | 'loesung'
        };

        // PP_32: Analyse-Modus & Stockfish
        const analysisState = {
            game: null,
            history: [],          // Array von FEN-Strings
            moves: [],            // Array von Zugobjekten: moves[i] erzeugt history[i+1] aus history[i]
            index: -1,
            selectedSquare: null
        };

        const sfState = {
            worker: null,
            ready: false,
            lines: [],            // Aktuelle Top-3-Varianten
            pendingFen: null,
            generation: 0,        // Counter to ignore stale info lines
            activeGeneration: 0,  // Generation that is currently active (after position sent)
            analyzing: false,     // true while a 'go' search is active (until bestmove)
            pendingAnalysis: null  // {fen, gen} queued while waiting for bestmove after stop
        };

        // Review drag state

        
        // Settings
        let settings = {
            timeLimit: 300,
            maxErrors: 3,
            startRating: 1400,
            ratingIncrease: 15,
            currentRating: 1400,
            soundMoves: true,
            soundEffects: true,
            themeFilter: [],
            themeMatchAll: false,
            animationDuration: 100,
            bonusTime: 0,
            errorBehavior: 'retry',
            tipstemas: true,
            tipsPiece: true,
            colorChoice: 'mixed',
            showRating: true,
            pieceCountMin: 3,
            pieceCountMax: 32
        };
        
        // =====================================================
        // SOUND EFFECTS SYSTEM (Unified Web Audio API)
        // Semua suara (langkah, capture, check, castle, promote,
        // solved, wrong, timeup) dijadwalkan lewat SATU AudioContext
        // yang sama, sehingga suara yang terjadi bersamaan (misal:
        // suara langkah + suara "solved" saat puzzle selesai) benar-
        // benar diputar serentak tanpa delay atau race condition.
        // File MP3 di /sound/ di-decode sekali menjadi AudioBuffer
        // saat pertama kali dibutuhkan, lalu di-cache untuk playback
        // instan berikutnya. Non-blocking: error apapun (file belum
        // ada, browser blokir autoplay, dll) tidak pernah menghentikan
        // permainan.
        // =====================================================

        const SOUND_FILES = {
            move: '/sound/move-self.mp3',
            capture: '/sound/capture.mp3',
            check: '/sound/move-check.mp3',
            castle: '/sound/castle.mp3',
            promote: '/sound/promote.mp3',
        };

        let sharedAudioCtx = null;
        const soundBuffers = {};       // key -> decoded AudioBuffer
        const soundLoadPromises = {};  // key -> in-flight fetch/decode promise

        function getAudioCtx() {
            if (!sharedAudioCtx) {
                try {
                    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
                } catch (e) {
                    return null;
                }
            }
            // Browsers may suspend the context until a user gesture; resume
            // opportunistically (non-blocking, ignored if it fails/no-ops).
            if (sharedAudioCtx.state === 'suspended') {
                sharedAudioCtx.resume().catch(() => {});
            }
            return sharedAudioCtx;
        }

        // Preload + decode all MP3s into AudioBuffers. Safe to call many
        // times - only fetches/decodes a given file once.
        function initAudio() {
            const ctx = getAudioCtx();
            if (!ctx) return;
            for (const key in SOUND_FILES) {
                if (soundBuffers[key] || soundLoadPromises[key]) continue;
                soundLoadPromises[key] = fetch(SOUND_FILES[key])
                    .then(res => res.arrayBuffer())
                    .then(data => ctx.decodeAudioData(data))
                    .then(buffer => { soundBuffers[key] = buffer; })
                    .catch(() => {
                        // File missing or decode failed - ignore, keep game running
                        delete soundLoadPromises[key];
                    });
            }
        }

        // Play a decoded buffer at a precise, shared-clock start time.
        // If startAt is omitted, plays immediately (ctx.currentTime).
        // Returns the scheduled start time so callers can synchronize
        // additional sounds against it.
        function playBufferAt(key, startAt) {
            const ctx = getAudioCtx();
            if (!ctx) return null;
            const buffer = soundBuffers[key];
            if (!buffer) {
                // Not decoded yet (first play before initAudio finished) -
                // kick off loading for next time, skip this playback silently.
                initAudio();
                return null;
            }
            try {
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                const gain = ctx.createGain();
                gain.gain.value = 1.0;
                source.connect(gain);
                gain.connect(ctx.destination);
                const t = startAt !== undefined ? startAt : ctx.currentTime;
                source.start(t);
                return t;
            } catch (e) {
                return null;
            }
        }

        // Public helper: play a preloaded sound by key immediately.
        function playSound(key) {
            playBufferAt(key);
        }

        // =====================================================
        // PLAY MOVE SOUND (main API - called by game logic)
        // options: { flags: string, promotion: string, isCheck: boolean }
        // Priority: promotion > castle > check > capture > normal move
        // Returns the shared AudioContext start time of the sound that
        // was played, so a following solved/wrong sound can be
        // scheduled to play at the exact same moment (see
        // playMoveSoundThen below).
        // =====================================================

        function resolveMoveSoundKey(piece, captured, options) {
            const flags = options?.flags || '';
            const promotion = options?.promotion;
            const isCheck = !!(options?.isCheck);
            const isCastle = flags.includes('k') || flags.includes('q');

            if (promotion && piece === 'p') return 'promote';
            if (isCastle) return 'castle';
            if (isCheck) return 'check';
            if (captured) return 'capture';
            return 'move';
        }

        function playMoveSound(piece, from, to, captured, options) {
            if (!settings.soundMoves) return null;
            initAudio();
            const key = resolveMoveSoundKey(piece, captured, options);
            return playBufferAt(key);
        }

        // Plays the move sound and a follow-up effect (solved/wrong/
        // timeup) at exactly the same scheduled start time on the
        // shared AudioContext clock, so both are audibly simultaneous
        // regardless of async decode/network timing.
        function playMoveSoundWithFollowUp(piece, from, to, captured, options, followUpFn) {
            if (!settings.soundMoves) {
                // Move sound disabled, still play the follow-up on its own.
                if (typeof followUpFn === 'function') followUpFn(undefined);
                return;
            }
            initAudio();
            const ctx = getAudioCtx();
            const key = resolveMoveSoundKey(piece, captured, options);
            const startAt = ctx ? ctx.currentTime : undefined;
            playBufferAt(key, startAt);
            if (typeof followUpFn === 'function') followUpFn(startAt);
        }

        // =====================================================
        // SOLVED SOUND (friendly ascending triad)
        // startAt: optional shared-clock time to sync with a move sound
        // =====================================================

        function playSolvedSound(startAt) {
            if (!settings.soundEffects) return;
            const ctx = getAudioCtx();
            if (!ctx) return;
            try {
                const now = startAt !== undefined ? startAt : ctx.currentTime;
                const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
                notes.forEach((freq, i) => {
                    const t = now + i * 0.09;
                    const osc = ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t);
                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0.0001, t);
                    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.4);
                });
            } catch (e) {
                // Ignore audio errors
            }
        }

        // =====================================================
        // WRONG SOUND (gentle descending interval)
        // startAt: optional shared-clock time to sync with a move sound
        // =====================================================

        function playWrongSound(startAt) {
            if (!settings.soundEffects) return;
            const ctx = getAudioCtx();
            if (!ctx) return;
            try {
                const now = startAt !== undefined ? startAt : ctx.currentTime;
                const notes = [440, 330];
                notes.forEach((freq, i) => {
                    const t = now + i * 0.10;
                    const osc = ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, t);
                    osc.frequency.exponentialRampToValueAtTime(freq * 0.92, t + 0.15);
                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0.2, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.22);
                });
            } catch (e) {
                // Ignore audio errors
            }
        }

        // =====================================================
        // TIME UP SOUND
        // startAt: optional shared-clock time to sync with a move sound
        // =====================================================

        function playTimeUpSound(startAt) {
            if (!settings.soundEffects) return;
            const ctx = getAudioCtx();
            if (!ctx) return;
            try {
                const now = startAt !== undefined ? startAt : ctx.currentTime;
                const freqs = [220, 277, 220, 277, 220, 277, 220, 277, 220, 277, 220, 277];
                freqs.forEach((freq, i) => {
                    const t = now + i * 0.08;
                    const osc = ctx.createOscillator();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(freq, t);
                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0.12, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.08);
                });
            } catch (e) {
                // Ignore audio errors
            }
        }

        
        // =====================================================
        // MOVE ANIMATION
        // =====================================================
        
        function getAnimationDuration() {
            // Stufen-Modus hat Vorrang
            const stappenLevels = (settings.themeFilter || []).filter(t => t.startsWith('stufe'));
            
            if (stappenLevels.length > 0) {
                const highestLevel = stappenLevels.sort().pop();
                switch (highestLevel) {
                    case 'stufe1': return 500;
                    case 'stufe2': return 400;
                    case 'stufe3': return 350;
                    case 'stufe4': return 250;
                    case 'stufe5': return 100;
                    default: return 300;
                }
            }
            
            // Unbegrenzt-Modus
            if (settings.timeLimit === 0) {
                return 300;
            }
            
            // Zeit-Modus (1-10 min)
            return 100;
        }
        

        // =====================================================
        // UNIFIED BOARD RENDERER
        // Shared rendering, animation, drag & touch for
        // both game board and review board.
        // =====================================================

        // Generic move animation - works for both boards
        function animateMoveGeneric(boardId, isFlipped, duration, from, to, pieceKey, callback) {
            const board = document.getElementById(boardId);
            if (!board) {
                if (callback) callback();
                return;
            }
            
            const boardRect = board.getBoundingClientRect();
            const squareSize = boardRect.width / 8;
            
            function getSquarePosition(square) {
                const fileIndex = square.charCodeAt(0) - 97;
                const rankIndex = parseInt(square[1]) - 1;
                const col = isFlipped ? 7 - fileIndex : fileIndex;
                const row = isFlipped ? rankIndex : 7 - rankIndex;
                return {
                    left: boardRect.left + col * squareSize,
                    top: boardRect.top + row * squareSize
                };
            }
            
            const fromPos = getSquarePosition(from);
            const toPos = getSquarePosition(to);
            const pieceSize = squareSize * PIECE_SCALE;
            const offset = (squareSize - pieceSize) / 2;
            
            const animEl = document.createElement('div');
            animEl.className = 'animated-piece';
            animEl.innerHTML = PIECE_SVG[pieceKey];
            animEl.style.width = pieceSize + 'px';
            animEl.style.height = pieceSize + 'px';
            animEl.style.left = (fromPos.left + offset) + 'px';
            animEl.style.top = (fromPos.top + offset) + 'px';
            animEl.style.transitionDuration = duration + 'ms';
            
            document.body.appendChild(animEl);
            
            const fromSquareEl = board.querySelector('[data-square="' + from + '"]');
            if (fromSquareEl) {
                const pieceSvg = fromSquareEl.querySelector('svg');
                if (pieceSvg) pieceSvg.style.visibility = 'hidden';
            }
            
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    animEl.style.left = (toPos.left + offset) + 'px';
                    animEl.style.top = (toPos.top + offset) + 'px';
                });
            });
            
            setTimeout(() => {
                animEl.remove();
                if (callback) callback();
            }, duration + 10);
        }

        // Wrappers preserve existing call signatures
        function animateMove(from, to, pieceKey, callback) {
            animateMoveGeneric('board', playerColor === 'b', settings.animationDuration, from, to, pieceKey, callback);
        }
        
        function animateReviewMove(from, to, pieceKey, callback) {
            animateMoveGeneric('review-board', reviewState.playerColor === 'b', ANIMATION.REVIEW_DURATION, from, to, pieceKey, callback);
        }

        // Generic board renderer
        // cfg: { boardId, chessGame, isFlipped, selectedSquare, lastMoveFrom, lastMoveTo,
        //        canInteract, playerColor, showValidMoves, hintSquare,
        //        onSquareClick, onDragStart }
        function renderBoardGeneric(cfg) {
            const board = document.getElementById(cfg.boardId);
            board.innerHTML = '';
            
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const actualRow = cfg.isFlipped ? 7 - row : row;
                    const actualCol = cfg.isFlipped ? 7 - col : col;
                    const file = 'abcdefgh'[actualCol];
                    const rank = 8 - actualRow;
                    const square = file + rank;
                    
                    const div = document.createElement('div');
                    div.className = 'square ' + ((actualRow + actualCol) % 2 === 0 ? 'light' : 'dark');
                    div.dataset.square = square;
                    
                    // Highlight last move
                    if (square === cfg.lastMoveFrom || square === cfg.lastMoveTo) {
                        div.classList.add('last-move');
                    }
                    
                    // Highlight selected square
                    if (cfg.selectedSquare === square) {
                        div.classList.add('selected');
                    }
                    
                    // Show valid moves (game board only)
                    if (cfg.showValidMoves && cfg.selectedSquare) {
                        const moves = cfg.chessGame.moves({ square: cfg.selectedSquare, verbose: true });
                        const move = moves.find(m => m.to === square);
                        if (move) {
                            div.classList.add(move.captured ? 'valid-capture' : 'valid-move');
                        }
                    }
                    
                    // Get piece
                    const piece = cfg.chessGame.get(square);
                    if (piece) {
                        const pieceKey = (piece.color === 'w' ? 'w' : 'b') + piece.type.toUpperCase();
                        div.innerHTML = PIECE_SVG[pieceKey];
                        const svg = div.querySelector('svg');
                        if (svg) svg.classList.add('piece');
                        
                        // Make player's pieces draggable (mouse only)
                        if (cfg.canInteract && piece.color === cfg.playerColor) {
                            div.style.cursor = 'grab';
                            div.addEventListener('mousedown', (e) => cfg.onDragStart(e, square));
                        }
                    }
                    
                    // Coordinates
                    if (col === 7) {
                        const rankCoord = document.createElement('span');
                        rankCoord.className = 'coord-rank';
                        rankCoord.textContent = rank;
                        div.appendChild(rankCoord);
                    }
                    if (row === 7) {
                        const fileCoord = document.createElement('span');
                        fileCoord.className = 'coord-file';
                        fileCoord.textContent = file;
                        div.appendChild(fileCoord);
                    }
                    
                    div.addEventListener('click', (e) => cfg.onSquareClick(square, e));
                    
                    // Hint highlight (game board only)
                    if (cfg.hintSquare === square) {
                        div.classList.add('hint-square');
                    }
                    
                    board.appendChild(div);
                }
            }
        }

        // Generic mouse drag handler factory
        function createMouseDragHandler(cfg) {
            // cfg: { boardId, getCanInteract, getPlayerColor, chessGame,
            //        getSelectedSquare, setSelectedSquare, onMoveAttempt, renderFn }
            let _draggedFrom = null;
            let _dragElement = null;
            let _isDragging = false;
            
            function start(e, square) {
                if (!cfg.getCanInteract()) return;
                
                const piece = cfg.chessGame().get(square);
                if (!piece || piece.color !== cfg.getPlayerColor()) return;
                
                // Deselect if clicking the already-selected piece
                if (cfg.getSelectedSquare && cfg.getSelectedSquare() === square) {
                    e.preventDefault();
                    cfg.setSelectedSquare(null);
                    cfg.renderFn();
                    return;
                }
                
                e.preventDefault();
                _draggedFrom = square;
                cfg.setSelectedSquare(square);
                
                const pieceKey = (piece.color === 'w' ? 'w' : 'b') + piece.type.toUpperCase();
                const board = document.getElementById(cfg.boardId);
                const squareSize = board ? board.getBoundingClientRect().width / 8 : 60;
                const dragSize = Math.round(squareSize * DRAG_SCALE);
                
                _dragElement = document.createElement('div');
                _dragElement.innerHTML = PIECE_SVG[pieceKey];
                _dragElement.style.cssText =
                    'position:fixed;pointer-events:none;z-index:1000;opacity:0.9;' +
                    'transform:translate(-50%,-50%);' +
                    'width:' + dragSize + 'px;height:' + dragSize + 'px;' +
                    'left:' + e.clientX + 'px;top:' + e.clientY + 'px;';
                document.body.appendChild(_dragElement);
                
                document.addEventListener('mousemove', move);
                document.addEventListener('mouseup', end);
                
                cfg.renderFn();
            }
            
            function move(e) {
                if (!_dragElement) return;
                _isDragging = true;
                _dragElement.style.left = e.clientX + 'px';
                _dragElement.style.top = e.clientY + 'px';
            }
            
            function end(e) {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', end);
                
                if (_dragElement) {
                    _dragElement.remove();
                    _dragElement = null;
                }
                
                if (!_draggedFrom) {
                    _isDragging = false;
                    return;
                }
                
                const targetElement = document.elementFromPoint(e.clientX, e.clientY);
                const targetSquareEl = targetElement?.closest('.square');
                const targetSquare = targetSquareEl?.dataset.square;
                
                if (_isDragging && targetSquare && _draggedFrom !== targetSquare) {
                    const from = _draggedFrom;
                    _draggedFrom = null;
                    const result = cfg.onMoveAttempt(from, targetSquare, e.clientX, e.clientY);
                    if (result) {
                        _isDragging = false;
                        return;
                    }
                }
                
                if (!_isDragging) {
                    _draggedFrom = null;
                    return;
                }
                
                cfg.setSelectedSquare(null);
                _draggedFrom = null;
                _isDragging = false;
                cfg.renderFn();
            }
            
            return {
                start,
                isDragging: () => _isDragging,
                resetDrag: () => { _isDragging = false; },
                cleanup: () => {
                    const existingDrag = document.getElementById('drag-piece');
                    if (existingDrag) existingDrag.remove();
                    if (_dragElement) { _dragElement.remove(); _dragElement = null; }
                    _draggedFrom = null;
                    _isDragging = false;
                }
            };
        }

        // Generic touch handler factory
        function createTouchHandler(cfg) {
            // cfg: { boardId, getCanInteract, getPlayerColor, chessGame,
            //        getSelectedSquare, setSelectedSquare, onMoveAttempt, renderFn,
            //        touchTransformY (optional, default '-80%') }
            let _draggedFrom = null;
            let _dragElement = null;
            let _isDragging = false;
            let _touchStartSquare = null;
            const transformY = cfg.touchTransformY || '-80%';
            
            function getSquareFromTouch(touch) {
                const el = document.elementFromPoint(touch.clientX, touch.clientY);
                const squareEl = el?.closest('.square');
                return squareEl?.dataset.square || null;
            }
            
            function onTouchStart(e) {
                if (!cfg.getCanInteract()) return;
                
                const touch = e.touches[0];
                const square = getSquareFromTouch(touch);
                if (!square) return;
                
                const chessGame = cfg.chessGame();
                const playerCol = cfg.getPlayerColor();
                const piece = chessGame.get(square);
                const isOwnPiece = piece && piece.color === playerCol;
                
                // If piece already selected, tapping elsewhere = try move
                if (cfg.getSelectedSquare() && cfg.getSelectedSquare() !== square) {
                    e.preventDefault();
                    const result = cfg.onMoveAttempt(cfg.getSelectedSquare(), square, touch.clientX, touch.clientY);
                    if (result) {
                        _touchStartSquare = null;
                        return;
                    }
                    if (!isOwnPiece) {
                        cfg.setSelectedSquare(null);
                        _touchStartSquare = null;
                        cfg.renderFn();
                        return;
                    }
                }
                
                if (isOwnPiece) {
                    e.preventDefault();
                    
                    // Deselect if tapping the same piece again
                    if (cfg.getSelectedSquare() === square) {
                        cfg.setSelectedSquare(null);
                        _touchStartSquare = null;
                        _draggedFrom = null;
                        cfg.renderFn();
                        return;
                    }
                    
                    _touchStartSquare = square;
                    cfg.setSelectedSquare(square);
                    _draggedFrom = square;
                    _isDragging = false;
                    
                    const pieceKey = (piece.color === 'w' ? 'w' : 'b') + piece.type.toUpperCase();
                    const board = document.getElementById(cfg.boardId);
                    const squareSize = board ? board.getBoundingClientRect().width / 8 : 60;
                    const dragSize = Math.round(squareSize * DRAG_SCALE);
                    
                    if (_dragElement) _dragElement.remove();
                    _dragElement = document.createElement('div');
                    _dragElement.id = 'drag-piece';
                    _dragElement.innerHTML = PIECE_SVG[pieceKey];
                    _dragElement.style.cssText =
                        'position:fixed;pointer-events:none;z-index:1000;opacity:0.9;' +
                        'transform:translate(-50%,' + transformY + ');' +
                        'width:' + dragSize + 'px;height:' + dragSize + 'px;' +
                        'left:' + touch.clientX + 'px;top:' + touch.clientY + 'px;';
                    document.body.appendChild(_dragElement);
                    
                    // Highlight without full re-render (critical for touch)
                    const boardEl = document.getElementById(cfg.boardId);
                    boardEl.querySelectorAll('.square.selected').forEach(el => el.classList.remove('selected'));
                    const squareEl = boardEl.querySelector('.square[data-square="' + square + '"]');
                    if (squareEl) squareEl.classList.add('selected');
                }
            }
            
            function onTouchMove(e) {
                if (!_dragElement || !_draggedFrom) return;
                e.preventDefault();
                _isDragging = true;
                const touch = e.touches[0];
                _dragElement.style.left = touch.clientX + 'px';
                _dragElement.style.top = touch.clientY + 'px';
            }
            
            function onTouchEnd(e) {
                if (!_draggedFrom) return;
                e.preventDefault();
                
                const touch = e.changedTouches[0];
                const targetSquare = getSquareFromTouch(touch);
                const fromSquare = _draggedFrom;
                const wasDragging = _isDragging;
                
                if (_dragElement) { _dragElement.remove(); _dragElement = null; }
                _draggedFrom = null;
                _isDragging = false;
                
                if (wasDragging && targetSquare && targetSquare !== fromSquare) {
                    const result = cfg.onMoveAttempt(fromSquare, targetSquare, touch.clientX, touch.clientY);
                    if (result) {
                        _touchStartSquare = null;
                        return;
                    }
                }
                
                _touchStartSquare = null;
                cfg.renderFn();
            }
            
            function onTouchCancel(e) {
                if (_dragElement) { _dragElement.remove(); _dragElement = null; }
                _draggedFrom = null;
                _isDragging = false;
                _touchStartSquare = null;
                cfg.setSelectedSquare(null);
                cfg.renderFn();
            }
            
            function setup() {
                const board = document.getElementById(cfg.boardId);
                if (!board) return;
                board.addEventListener('touchstart', onTouchStart, { passive: false });
                board.addEventListener('touchmove', onTouchMove, { passive: false });
                board.addEventListener('touchend', onTouchEnd, { passive: false });
                board.addEventListener('touchcancel', onTouchCancel, { passive: false });
            }
            
            return { setup, isDragging: () => _isDragging, resetDrag: () => { _isDragging = false; } };
        }

        // =====================================================
        // GAME BOARD - instances using generic renderer
        // =====================================================
        
        const gameDrag = createMouseDragHandler({
            boardId: 'board',
            getCanInteract: () => gameActive && game.turn() === playerColor,
            getPlayerColor: () => playerColor,
            chessGame: () => game,
            getSelectedSquare: () => selectedSquare,
            setSelectedSquare: (sq) => { selectedSquare = sq; },
            onMoveAttempt: (from, to, clientX, clientY) => {
                const move = tryMove(from, to);
                if (move === 'promotion') {
                    showPromotionDialog(from, to, clientX, clientY);
                    return true;
                } else if (move) {
                    selectedSquare = null;
                    renderBoard();
                    checkPlayerMove(move);
                    return true;
                }
                return false;
            },
            renderFn: () => renderBoard()
        });
        
        const gameTouch = createTouchHandler({
            boardId: 'board',
            getCanInteract: () => gameActive && game.turn() === playerColor,
            getPlayerColor: () => playerColor,
            chessGame: () => game,
            getSelectedSquare: () => selectedSquare,
            setSelectedSquare: (sq) => { selectedSquare = sq; },
            onMoveAttempt: (from, to, clientX, clientY) => {
                const move = tryMove(from, to);
                if (move === 'promotion') {
                    showPromotionDialog(from, to, clientX, clientY);
                    return true;
                } else if (move) {
                    selectedSquare = null;
                    renderBoard();
                    checkPlayerMove(move);
                    return true;
                }
                return false;
            },
            renderFn: () => renderBoard()
        });
        
        const reviewDrag = createMouseDragHandler({
            boardId: 'review-board',
            getCanInteract: () => reviewState.mode === 'solution' && !reviewState.puzzleolved && !reviewState.solutionVisible && reviewState.game && reviewState.game.turn() === reviewState.playerColor,
            getPlayerColor: () => reviewState.playerColor,
            chessGame: () => reviewState.game,
            getSelectedSquare: () => reviewState.selectedSquare,
            setSelectedSquare: (sq) => { reviewState.selectedSquare = sq; },
            onMoveAttempt: (from, to) => {
                tryReviewMove(from, to);
                return true;
            },
            renderFn: () => renderReviewBoard()
        });
        
        const reviewTouch = createTouchHandler({
            boardId: 'review-board',
            getCanInteract: () => reviewState.mode === 'solution' && !reviewState.puzzleolved && !reviewState.solutionVisible && reviewState.game && reviewState.game.turn() === reviewState.playerColor,
            getPlayerColor: () => reviewState.playerColor,
            chessGame: () => reviewState.game,
            getSelectedSquare: () => reviewState.selectedSquare,
            setSelectedSquare: (sq) => { reviewState.selectedSquare = sq; },
            onMoveAttempt: (from, to) => {
                tryReviewMove(from, to);
                return true;
            },
            renderFn: () => renderReviewBoard()
        });

        // PP_32: Analyse-Modus Drag & Touch Handler
        const analysisDrag = createMouseDragHandler({
            boardId: 'review-board',
            getCanInteract: () => reviewState.mode !== 'solution' && analysisState.game !== null,
            getPlayerColor: () => analysisState.game ? analysisState.game.turn() : 'w',
            chessGame: () => analysisState.game,
            getSelectedSquare: () => analysisState.selectedSquare,
            setSelectedSquare: (sq) => { analysisState.selectedSquare = sq; },
            onMoveAttempt: (from, to) => {
                analysisMakeMove(from, to, null);
                return true;
            },
            renderFn: () => renderAnalysisBoard()
        });

        const analysisTouch = createTouchHandler({
            boardId: 'review-board',
            getCanInteract: () => reviewState.mode !== 'solution' && analysisState.game !== null,
            getPlayerColor: () => analysisState.game ? analysisState.game.turn() : 'w',
            chessGame: () => analysisState.game,
            getSelectedSquare: () => analysisState.selectedSquare,
            setSelectedSquare: (sq) => { analysisState.selectedSquare = sq; },
            onMoveAttempt: (from, to) => {
                analysisMakeMove(from, to, null);
                return true;
            },
            renderFn: () => renderAnalysisBoard()
        });

        // =====================================================
        // BOARD RENDERING (using generic renderer)
        // =====================================================
        function renderBoard() {
            renderBoardGeneric({
                boardId: 'board',
                chessGame: game,
                isFlipped: playerColor === 'b',
                selectedSquare: selectedSquare,
                lastMoveFrom: lastMoveFrom,
                lastMoveTo: lastMoveTo,
                canInteract: gameActive,
                playerColor: playerColor,
                showValidMoves: gameActive && game.turn() === playerColor,
                hintSquare: hintSquare,
                onSquareClick: handleSquareClick,
                onDragStart: gameDrag.start
            });
            
            updateTurnIndicator();
        }
        
        
        function updateTurnIndicator() {
            const indicator = document.getElementById('turn-indicator');
            indicator.classList.remove('white', 'black');
            if (game.turn() === 'w') {
                indicator.classList.add('white');
            } else {
                indicator.classList.add('black');
            }
        }

        // =====================================================
        // MOVE HANDLING
        // =====================================================
        function handleSquareClick(square, event) {
            if (gameDrag.isDragging()) {
                gameDrag.resetDrag();
                return;
            }
            if (!gameActive) return;
            if (game.turn() !== playerColor) return;
            
            const piece = game.get(square);
            
            if (selectedSquare) {
                // Deselect if clicking the same piece again
                if (selectedSquare === square) {
                    selectedSquare = null;
                    renderBoard();
                    return;
                }
                const move = tryMove(selectedSquare, square);
                if (move === 'promotion') {
                    const rect = event?.target?.closest('.square')?.getBoundingClientRect();
                    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
                    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
                    showPromotionDialog(selectedSquare, square, x, y);
                } else if (move) {
                    selectedSquare = null;
                    renderBoard();
                    checkPlayerMove(move);
                } else if (piece && piece.color === playerColor) {
                    selectedSquare = square;
                    renderBoard();
                } else {
                    selectedSquare = null;
                    renderBoard();
                }
            } else {
                if (piece && piece.color === playerColor) {
                    selectedSquare = square;
                    renderBoard();
                }
            }
        }
        
        // =====================================================
        // TOUCH HANDLING (using generic touch handler)
        // =====================================================
        function setupBoardTouchHandlers() {
            gameTouch.setup();
        }
        
        function cleanupDrag() {
            gameDrag.cleanup();
        }
        
        function tryMove(from, to, promotion) {
            const piece = game.get(from);
            
            // Check if this is a pawn promotion
            if (piece && piece.type === 'p' && !promotion) {
                const targetRank = to[1];
                if ((piece.color === 'w' && targetRank === '8') || 
                    (piece.color === 'b' && targetRank === '1')) {
                    // Verify that this pawn move is actually legal before showing dialog
                    const legalMoves = game.moves({ square: from, verbose: true });
                    const isLegalPromotion = legalMoves.some(m => m.to === to && m.flags.includes('p'));
                    if (isLegalPromotion) {
                        return 'promotion';
                    }
                    // Not a legal promotion move - fall through to normal move attempt
                }
            }
            
            const captured = game.get(to);
            
            const move = game.move({
                from: from,
                to: to,
                promotion: promotion
            });
            
            if (move) {
                lastMoveFrom = from;
                lastMoveTo = to;
                lastMoveSoundTime = playMoveSound(piece.type, from, to, captured ? captured.type : null, {
                    flags: move.flags || '',
                    promotion: move.promotion,
                    isCheck: !!(move.san && (move.san.includes('+') || move.san.includes('#')))
                });
            }
            
            return move;
        }
        
        function showPromotionDialog(from, to, x, y) {
            const piece = game.get(from);
            if (!piece) return;
            
            pendingPromotion = { from, to, color: piece.color };
            
            const dialog = document.getElementById('promotion-dialog');
            const colorPrefix = piece.color === 'w' ? 'w' : 'b';
            
            // Populate with correct colored pieces (order: Queen, Knight, Rook, Bishop)
            const options = dialog.querySelectorAll('.promotion-option');
            const pieces = ['Q', 'N', 'R', 'B'];
            const pieceData = ['q', 'n', 'r', 'b'];
            options.forEach((opt, i) => {
                opt.innerHTML = PIECE_SVG[colorPrefix + pieces[i]];
                opt.dataset.piece = pieceData[i];
            });
            
            // Get board and calculate square size
            const board = document.getElementById('board');
            const boardRect = board.getBoundingClientRect();
            const squareSize = boardRect.width / 8;
            
            // Set dialog option size to match square size
            options.forEach(opt => {
                opt.style.width = squareSize + 'px';
                opt.style.height = squareSize + 'px';
            });
            
            // Calculate target square position
            const isFlipped = playerColor === 'b';
            const fileIndex = to.charCodeAt(0) - 97; // 0-7
            const rankIndex = parseInt(to[1]) - 1; // 0-7
            
            const col = isFlipped ? 7 - fileIndex : fileIndex;
            const row = isFlipped ? rankIndex : 7 - rankIndex;
            
            const squareLeft = boardRect.left + col * squareSize;
            const squareTop = boardRect.top + row * squareSize;
            
            // Position dialog starting at the target square
            let left = squareLeft - 2; // -2 for border offset
            
            // User promotions are always at the top of the visual board (row 0)
            // Dialog should always go DOWN into the board
            let top = squareTop - 2;
            
            dialog.style.left = left + 'px';
            dialog.style.top = top + 'px';
            dialog.classList.add('active');
        }
        
        function hidePromotionDialog() {
            const dialog = document.getElementById('promotion-dialog');
            dialog.classList.remove('active');
            pendingPromotion = null;
        }

        function handlePromotionChoice(piece) {
            // Check if it's an analysis/stockfish promotion
            if (pendingAnalysisPromotion) {
                handleAnalysisPromotionChoice(piece);
                return;
            }
            // Check if it's a review promotion
            if (pendingReviewPromotion) {
                handleReviewPromotionChoice(piece);
                return;
            }

            if (!pendingPromotion) return;
            
            const { from, to } = pendingPromotion;
            hidePromotionDialog();
            
            const move = tryMove(from, to, piece);
            if (move && move !== 'promotion') {
                selectedSquare = null;
                renderBoard();
                checkPlayerMove(move);
            }
        }
        
        // Initialize promotion dialog click handlers
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('.promotion-option').forEach(opt => {
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handlePromotionChoice(opt.dataset.piece);
                });
                opt.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePromotionChoice(opt.dataset.piece);
                });
            });
            
            // Close dialog when clicking outside
            document.addEventListener('click', (e) => {
                if ((pendingPromotion || pendingReviewPromotion || pendingAnalysisPromotion)
                    && !e.target.closest('.promotion-dialog')) {
                    hidePromotionDialog();
                    pendingReviewPromotion = null;
                    pendingAnalysisPromotion = null;
                }
            });
        });
        
        function makeUCIMove(uci) {
            const from = uci.substring(0, 2);
            const to = uci.substring(2, 4);
            const promotion = uci.length > 4 ? uci[4] : undefined;
            
            const move = game.move({
                from: from,
                to: to,
                promotion: promotion
            });
            
            if (move) {
                lastMoveFrom = from;
                lastMoveTo = to;
            }
            
            return move;
        }
        
        // =====================================================
        // KEYBOARD / TEXT INPUT
        // =====================================================
        const PIECE_NAMES = {
            de: {
                'k\u00f6nig': 'k', 'k': 'k',
                'dame': 'q', 'd': 'q',
                'turm': 'r', 't': 'r',
                'l\u00e4ufer': 'b', 'l': 'b',
                'springer': 'n', 's': 'n',
                'bauer': 'p', 'b': 'b',
                'king': 'k', 'queen': 'q', 'q': 'q', 'rook': 'r', 'r': 'r',
                'bishop': 'b', 'knight': 'n', 'n': 'n', 'pawn': 'p', 'p': 'p'
            },
            en: {
                'king': 'k', 'k': 'k',
                'queen': 'q', 'q': 'q',
                'rook': 'r', 'r': 'r',
                'bishop': 'b', 'b': 'b',
                'knight': 'n', 'n': 'n',
                'pawn': 'p', 'p': 'p'
            }
        };
        
        function parseMoveInput(input) {
            if (!input || !gameActive || game.turn() !== playerColor) return null;
            
            let text = input.trim().toLowerCase();
            text = text.replace(currentLang === 'de' ? /schl\u00e4gt|takes|captures|x|:/g : /takes|captures|x|:/g, '');
            text = text.replace(/\s+/g, ' ').trim();

            if (text === 'o-o' || text === '0-0' || text === 'kurze rochade' || text === 'castle short' || text === 'castle' || text === 'kingside' || text === 'short') {
                return game.move('O-O');
            }
            if (text === 'o-o-o' || text === '0-0-0' || text === 'lange rochade' || text === 'castle long' || text === 'queenside' || text === 'long') {
                return game.move('O-O-O');
            }
            
            const uciMatch = text.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/);
            if (uciMatch) {
                const move = game.move({
                    from: uciMatch[1],
                    to: uciMatch[2],
                    promotion: uciMatch[3]
                });
                if (move) {
                    lastMoveFrom = uciMatch[1];
                    lastMoveTo = uciMatch[2];
                    return move;
                }
            }
            
            const langformMatch = text.match(/^(\w+)\s+([a-h][1-8])([qrbn])?$/);
            if (langformMatch) {
                const pieceName = langformMatch[1];
                const targetSquare = langformMatch[2];
                const promotion = langformMatch[3];
                
                const pieceType = PIECE_NAMES[currentLang][pieceName];
                if (pieceType) {
                    const moves = game.moves({ verbose: true });
                    const matchingMove = moves.find(m => 
                        m.piece === pieceType && 
                        m.to === targetSquare
                    );
                    if (matchingMove) {
                        const move = game.move({
                            from: matchingMove.from,
                            to: matchingMove.to,
                            promotion: promotion || matchingMove.promotion
                        });
                        if (move) {
                            lastMoveFrom = matchingMove.from;
                            lastMoveTo = matchingMove.to;
                            return move;
                        }
                    }
                }
            }
            
            let san = input.trim();
            if (currentLang === 'de') {
                san = san.replace(/^D/i, 'Q');
                san = san.replace(/^T/i, 'R');
                san = san.replace(/^L/i, 'B');
                san = san.replace(/^S/i, 'N');
            }
            san = san.replace(/^K/i, 'K');
            san = san.replace(/[:]/g, 'x');
            
            try {
                const move = game.move(san, { sloppy: true });
                if (move) {
                    lastMoveFrom = move.from;
                    lastMoveTo = move.to;
                    return move;
                }
            } catch (e) {}
            
            const pawnMatch = text.match(/^([a-h][1-8])$/);
            if (pawnMatch) {
                const moves = game.moves({ verbose: true });
                const pawnMove = moves.find(m => m.piece === 'p' && m.to === pawnMatch[1]);
                if (pawnMove) {
                    const move = game.move({
                        from: pawnMove.from,
                        to: pawnMove.to,
                        promotion: 'q'
                    });
                    if (move) {
                        lastMoveFrom = pawnMove.from;
                        lastMoveTo = pawnMove.to;
                        return move;
                    }
                }
            }
            
            return null;
        }
        
        function submitMoveInput() {
            const container = document.querySelector('.move-input-container');
            const input = document.getElementById('move-input');
            const text = input.value.trim();
            
            if (!text) {
                hideInputField();
                return;
            }
            
            const move = parseMoveInput(text);
            
            if (move) {
                hideInputField();
                selectedSquare = null;
                // Play sound for keyboard/voice moves (with flags for castling/promotion)
                if (settings.soundMoves) {
                    initAudio();
                    lastMoveSoundTime = playMoveSound(move.piece, move.from, move.to, move.captured ? move.captured : null, {
                        flags: move.flags || '',
                        promotion: move.promotion,
                        isCheck: !!(move.san && (move.san.includes('+') || move.san.includes('#')))
                    });
                }
                renderBoard();
                checkPlayerMove(move);
            } else {
                input.classList.add('shake');
                setTimeout(() => input.classList.remove('shake'), ANIMATION.SHAKE_DURATION);
                setFeedback(t('invalidMoveWith') + text, 'wrong');
            }
        }
        
        function showInputField() {
            const container = document.querySelector('.move-input-container');
            const input = document.getElementById('move-input');
            container.classList.add('visible');
            input.focus();
        }
        
        function hideInputField() {
            const container = document.querySelector('.move-input-container');
            const input = document.getElementById('move-input');
            container.classList.remove('visible');
            input.value = '';
            input.blur();
        }
        
        document.addEventListener('keydown', function(e) {
            if (!gameActive) return;
            if (document.activeElement.tagName === 'SELECT') return;
            
            if (e.code === 'Space' && document.getElementById('skip-btn').style.display !== 'none') {
                e.preventDefault();
                skipPuzzle();
                return;
            }
            
            if (/^[a-zA-Z0-9]$/.test(e.key)) {
                showInputField();
            }
        });
        
        document.addEventListener('DOMContentLoaded', function() {
            const input = document.getElementById('move-input');
            if (input) {
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        submitMoveInput();
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        hideInputField();
                    }
                });
            }
        });
        
        function checkPlayerMove(move) {
            const expectedUCI = puzzleMoves[moveIndex];
            const playerUCI = move.from + move.to + (move.promotion || '');
            
            // Check if this is the last move of the puzzle
            const isLastMove = (moveIndex === puzzleMoves.length - 1);
            
            // Clear hint on any move attempt
            clearHint();
            
            // Normal correct move OR alternate checkmate on last move
            if (playerUCI === expectedUCI || (isLastMove && game.in_checkmate())) {
                moveIndex++;
                updateProgress();

                // Bonus time per correct move (only in timed mode)
                if (settings.bonusTime > 0 && settings.timeLimit > 0) {
                    timeLeft += settings.bonusTime;
                    updateTimerDisplay();
                }
                
                if (moveIndex >= puzzleMoves.length) {
                    puzzleolved();
                } else {
                    if (gameActive) {
                        makeOpponentMove();
                    }
                }
            } else {
                game.undo();
                lastMoveFrom = null;
                lastMoveTo = null;
                wrongMove(playerUCI);
                renderBoard();
            }
        }
        
        function makeOpponentMove() {
            const uci = puzzleMoves[moveIndex];
            const from = uci.substring(0, 2);
            const to = uci.substring(2, 4);
            const promotion = uci.length > 4 ? uci[4] : undefined;
            
            // Hole Figur VOR dem Zug
            const piece = game.get(from);
            if (!piece) {
                // Fallback ohne Animation
                makeUCIMove(uci);
                moveIndex++;
                renderBoard();
                setFeedback(t('yourMove'), 'neutral');
                updateProgress();
                return;
            }
            
            const pieceKey = (piece.color === 'w' ? 'w' : 'b') + piece.type.toUpperCase();
            
            // Animiere den Zug
            animateMove(from, to, pieceKey, () => {
                // Nach Animation: Zug ausf\u00fchren
                makeUCIMove(uci);
                moveIndex++;
                renderBoard();
                setFeedback(t('yourMove'), 'neutral');
                updateProgress();
            });
        }
        
        function updateProgress() {
            const playerMoves = Math.ceil((puzzleMoves.length - 1) / 2);
            const completedPlayerMoves = Math.ceil((moveIndex - 1) / 2);
            const progress = playerMoves > 0 ? (completedPlayerMoves / playerMoves) * 100 : 0;
            document.getElementById('progress-fill').style.width = progress + '%';
        }
        
        // =====================================================
        // PUZZLE MANAGEMENT
        // =====================================================
        function countPieces(fen) {
            const board = fen.split(' ')[0];
            return board.replace(/[^a-zA-Z]/g, '').length;
        }

        function loadNextPuzzle(skipRetries = 0) {
            // Guard against infinite recursion from corrupt puzzle
            if (skipRetries > 10) {
                console.error('Too many invalid puzzle, stopping');
                showTemporaryAlert(t('errorLoadingpuzzle'));
                endGame();
                return false;
            }
            document.getElementById('skip-btn').style.display = 'none';
            document.querySelector('.move-input-container').classList.remove('visible');
            document.getElementById('move-input').value = '';
            clearHint();
            
            // Reset tracking for new puzzle
            currentpuzzletartTime = Date.now();
            currentPuzzleAttempts = 0;
            currentPuzzleWrongMoves = [];
            currentPuzzleUniqueErrors.clear();
            currentPuzzleUsedThemeHint = false;
            currentPuzzleUsedPieceHint = false;
            
            // Filter puzzle by selected themes
            const selectedThemes = settings.themeFilter || [];
            const matchAll = settings.themeMatchAll || false;
            let availablepuzzle = puzzle;
            
            // Check if any Stufen level is selected
            const stappenLevels = selectedThemes.filter(t => t.startsWith('stufe'));
            
            if (stappenLevels.length > 0) {
                // Stufen mode: 50% neue Motive, 50% alte Motive + rating filter
                const highestLevel = stappenLevels.sort().pop();
                
                // Collect NEW themes (current level only)
                const newThemes = STUFEN_THEMES[highestLevel] || [];
                
                // Collect OLD themes (all previous levels)
                const oldThemes = [];
                for (const level of ['stufe1', 'stufe2', 'stufe3', 'stufe4', 'stufe5']) {
                    if (level === highestLevel) break;
                    oldThemes.push(...STUFEN_THEMES[level]);
                }
                
                const [minRating, maxRating] = STUFEN_RATINGS[highestLevel];
                
                // 50/50 Entscheidung: neue oder alte Motive
                const useNewThemes = oldThemes.length === 0 || Math.random() < 0.5;
                const themesToUse = useNewThemes ? newThemes : oldThemes;
                
                const themesToSearch = themesToUse.flatMap(theme => 
                    THEME_MAPPINGS[theme] || [theme]
                );
                
                availablepuzzle = puzzle.filter(p => {
                    const puzzleRating = p[3];
                    const puzzleThemes = p[4].toLowerCase();
                    
                    if (puzzleRating < minRating || puzzleRating > maxRating) return false;
                    
                    return themesToSearch.some(theme => 
                        puzzleThemes.includes(theme.toLowerCase())
                    );
                });
                
                // Fallback: wenn keine puzzle gefunden, versuche alle kumulativen Themen
                if (availablepuzzle.length === 0) {
                    const allStufeThemes = [...newThemes, ...oldThemes];
                    const allThemesToSearch = allStufeThemes.flatMap(theme => 
                        THEME_MAPPINGS[theme] || [theme]
                    );
                    
                    availablepuzzle = puzzle.filter(p => {
                        const puzzleRating = p[3];
                        const puzzleThemes = p[4].toLowerCase();
                        
                        if (puzzleRating < minRating || puzzleRating > maxRating) return false;
                        
                        return allThemesToSearch.some(theme => 
                            puzzleThemes.includes(theme.toLowerCase())
                        );
                    });
                }
                
            } else if (selectedThemes.length > 0) {
                // Regular theme filter mode
                availablepuzzle = puzzle.filter(p => {
                    const puzzleThemes = p[4].toLowerCase();
                    
                    if (matchAll) {
                        // UND-Logik: puzzle must match EACH selected theme
                        // (a theme matches if ANY of its mapped sub-themes is present)
                        return selectedThemes.every(theme => {
                            const expandedThemes = THEME_MAPPINGS[theme] || [theme];
                            return expandedThemes.some(t => 
                                puzzleThemes.includes(t.toLowerCase())
                            );
                        });
                    } else {
                        // ODER-Logik: puzzle must match ANY selected theme
                        const allThemesToSearch = selectedThemes.flatMap(theme => 
                            THEME_MAPPINGS[theme] || [theme]
                        );
                        return allThemesToSearch.some(theme => 
                            puzzleThemes.includes(theme.toLowerCase())
                        );
                    }
                });
            }
            
            // Color filter: filter by player color
            const colorPref = settings.colorChoice === 'random' ? settings._randomColor : settings.colorChoice;
            if (colorPref === 'white' || colorPref === 'black') {
                // In puzzle FEN, the side to move makes the first (opponent) move,
                // so the player is the OTHER color.
                // Player=white means FEN has 'b' to move (black moves first, then white solves)
                const fenTurn = colorPref === 'white' ? ' b ' : ' w ';
                availablepuzzle = availablepuzzle.filter(p => p[1].includes(fenTurn));
            }

            // Piece count filter
            if (settings.pieceCountMin > 3 || settings.pieceCountMax < 32) {
                availablepuzzle = availablepuzzle.filter(p => {
                    const count = countPieces(p[1]);
                    return count >= settings.pieceCountMin && count <= settings.pieceCountMax;
                });
            }

            // Check if filter returned no puzzle
            if (availablepuzzle.length === 0) {
                showTemporaryAlert(t('nopuzzleForFilter'));
                return false; // Signal to not start game
            }
            
            // Store filtered puzzle for this session
            settings.filteredpuzzle = availablepuzzle;
            
            const targetRating = settings.currentRating;
            const halfIncrease = Math.max(settings.ratingIncrease / 2, 10); // At least &plusmn;10
            
            // Search in range [target - halfIncrease, target + halfIncrease]
            let candidates = availablepuzzle.filter(p => {
                const rating = p[3];
                return rating >= targetRating - halfIncrease && 
                       rating <= targetRating + halfIncrease && 
                       !usedpuzzle.has(p[0]);
            });
            
            // If no puzzle in range, take next higher ones
            if (candidates.length === 0) {
                candidates = availablepuzzle.filter(p => {
                    return p[3] > targetRating + halfIncrease && !usedpuzzle.has(p[0]);
                }).sort((a, b) => a[3] - b[3]).slice(0, 20); // Limit to 20 closest higher puzzle
            }
            
            // If still none, check if Stufen mode and use upper half of range
            if (candidates.length === 0) {
                const stappenLevels = (settings.themeFilter || []).filter(t => t.startsWith('stufe'));
                
                if (stappenLevels.length > 0) {
                    // Stufen mode: use upper half of rating range
                    const highestLevel = stappenLevels.sort().pop();
                    const [minRating, maxRating] = STUFEN_RATINGS[highestLevel];
                    const midRating = Math.floor((minRating + maxRating) / 2);
                    
                    candidates = availablepuzzle.filter(p => {
                        return p[3] >= midRating && !usedpuzzle.has(p[0]);
                    });
                }
            }
            
            // If still none, check if any unused exist
            if (candidates.length === 0) {
                const allUnused = availablepuzzle.filter(p => !usedpuzzle.has(p[0]));
                
                if (allUnused.length === 0) {
                    // All puzzle with this filter have been played
                    gameActive = false; // Prevent further puzzle loading
                    showTemporaryAlert(t('allpuzzlePlayed'));
                    setTimeout(() => endGame(), ANIMATION.END_GAME_DELAY);
                    return false;
                }
                
                // Use whatever is left (lower rated)
                candidates = allUnused;
            }
            
            // Pick truly random from ALL candidates in interval
            currentPuzzle = candidates[Math.floor(Math.random() * candidates.length)];
            usedpuzzle.add(currentPuzzle[0]);
            
            const [id, fen, moves, rating, themes] = currentPuzzle;
            
            // Validate puzzle data
            if (!fen || !moves) {
                console.warn('Skipping puzzle with missing data:', id);
                return loadNextPuzzle(skipRetries + 1);
            }
            
            puzzleMoves = moves.split(' ');
            if (puzzleMoves.length < 2) {
                console.warn('Skipping puzzle with insufficient moves:', id);
                return loadNextPuzzle(skipRetries + 1);
            }
            
            moveIndex = 0;
            
            try {
                game = new Chess(fen);
            } catch (e) {
                console.warn('Skipping puzzle with invalid FEN:', id, fen);
                return loadNextPuzzle(skipRetries + 1);
            }
            
            // Verify FEN produced a valid position
            if (!game.fen()) {
                console.warn('Skipping puzzle with invalid position:', id);
                return loadNextPuzzle(skipRetries + 1);
            }
            
            const setupColor = game.turn();
            playerColor = setupColor === 'w' ? 'b' : 'w';
            
            // Render Brett mit Ausgangstellung ZUERST
            renderBoard();
            
            document.getElementById('current-rating').textContent = currentPuzzle[3]; // Show puzzle rating
            setFeedback('...', 'neutral');
            
            // Initialen Gegnerzug ausfuehren
            const firstUci = puzzleMoves[0];
            const firstMove = makeUCIMove(firstUci);
            if (!firstMove) {
                console.warn('Skipping puzzle with invalid first move:', id, firstUci);
                return loadNextPuzzle(skipRetries + 1);
            }
            moveIndex = 1;
            renderBoard();
            setFeedback(t('findBestMove'), 'neutral');
            updateProgress();
            
            return true; // Success
        }
        
        function puzzleolved() {
            // Save solved puzzle to tracking
            const timeSpent = (Date.now() - currentpuzzletartTime) / 1000;
            playedpuzzle.push({
                puzzle: currentPuzzle,
                solved: true,
                attempts: currentPuzzleAttempts + 1,
                timeSpent: timeSpent,
                wrongMoves: [...currentPuzzleWrongMoves]
            });
            
            // Record for performance rating
            recordPuzzlePerformance(currentPuzzle[3], true, timeSpent, currentPuzzleAttempts);
            
            solved++;
            document.getElementById('solved').textContent = solved;
            document.getElementById('solved').classList.add('pulse');
            setTimeout(() => document.getElementById('solved').classList.remove('pulse'), ANIMATION.PULSE_DURATION);
            
            setFeedback(t('solvedMsg'), 'correct');
            playSolvedSound(lastMoveSoundTime);

            // Daily mode: show result screen instead of next puzzle
            if (dailyMode) {
                gameActive = false;
                setTimeout(() => showDailyResult(true), 1200);
                return;
            }
            
            settings.currentRating += settings.ratingIncrease;
            
            if (gameActive) {
                loadNextPuzzle();
            }
        }
        
        function wrongMove(playerUCI) {
            // Track wrong move
            currentPuzzleAttempts++;
            currentPuzzleWrongMoves.push({
                expected: puzzleMoves[moveIndex],
                moveIndex: moveIndex
            });
            
            // Count each unique wrong move as an error
            if (!currentPuzzleUniqueErrors.has(playerUCI)) {
                currentPuzzleUniqueErrors.add(playerUCI);
                errors++;
                const maxErrors = settings.maxErrors === 0 ? '\u221e' : settings.maxErrors;
                document.getElementById('errors').textContent = errors + '/' + maxErrors;
                
                if (settings.maxErrors > 0 && errors >= settings.maxErrors) {
                    playWrongSound(lastMoveSoundTime);
                    endGame();
                    return;
                }
            }
            
            playWrongSound(lastMoveSoundTime);

            setFeedback(t('wrongMsg'), 'wrong');
            document.querySelector('.board').classList.add('shake');
            setTimeout(() => document.querySelector('.board').classList.remove('shake'), ANIMATION.SHAKE_DURATION);

            // Error behavior: skip to next or allow retry
            if (settings.errorBehavior === 'next' && !dailyMode) {
                // Brief pause to show error, then auto-skip
                setTimeout(() => {
                    if (gameActive) skipPuzzle();
                }, ANIMATION.SHAKE_DURATION + 300);
            } else {
                setFeedback(t('wrongTryAgainMsg'), 'wrong');
                document.getElementById('skip-btn').style.display = 'block';
            }
        }
        
        function skipPuzzle() {
            // Save skipped puzzle to tracking
            const timeSpent = (Date.now() - currentpuzzletartTime) / 1000;
            playedpuzzle.push({
                puzzle: currentPuzzle,
                solved: false,
                attempts: currentPuzzleAttempts,
                timeSpent: timeSpent,
                wrongMoves: [...currentPuzzleWrongMoves]
            });
            
            // Record for performance rating (failed)
            recordPuzzlePerformance(currentPuzzle[3], false, timeSpent, currentPuzzleAttempts);
            
            // Daily mode: show result instead of next puzzle
            if (dailyMode) {
                gameActive = false;
                document.getElementById('skip-btn').style.display = 'none';
                showDailyResult(false);
                return;
            }
            
            document.getElementById('skip-btn').style.display = 'none';
            loadNextPuzzle();
        }

        // GAME FLOW
        // =====================================================
        function toggleCustomInput(type) {
            const selectId = {
                'time': 'time-limit',
                'errors': 'max-errors',
                'rating': 'start-rating',
                'increase': 'rating-increase',
                'bonus': 'bonus-time'
            }[type];

            const select = document.getElementById(selectId);
            const customDiv = document.getElementById(type + '-custom');

            if (select.value === 'custom') {
                customDiv.style.display = 'flex';
            } else {
                customDiv.style.display = 'none';
            }
        }

        // Extended settings toggle
        function toggleExtendedSettings() {
            const btn = document.querySelector('.extended-toggle');
            const content = document.getElementById('extended-content');
            btn.classList.toggle('open');
            content.classList.toggle('open');
        }

        function startGame() {
            sfTerminate(); // PP_32: Stockfish Worker beenden
            // Read settings
            const timeSelect = document.getElementById('time-limit');
            if (timeSelect.value === 'custom') {
                const mins = parseInt(document.getElementById('time-custom-value').value) || 5;
                settings.timeLimit = Math.min(999, Math.max(1, mins)) * 60;
            } else {
                settings.timeLimit = parseInt(timeSelect.value);
            }
            
            const errorsSelect = document.getElementById('max-errors');
            if (errorsSelect.value === 'custom') {
                const errs = parseInt(document.getElementById('errors-custom-value').value) || 3;
                settings.maxErrors = Math.min(99, Math.max(1, errs));
            } else {
                settings.maxErrors = parseInt(errorsSelect.value);
            }
            
            const ratingSelect = document.getElementById('start-rating');
            if (ratingSelect.value === 'custom') {
                const rat = parseInt(document.getElementById('rating-custom-value').value) || 1400;
                settings.startRating = Math.min(3200, Math.max(0, rat));
            } else {
                settings.startRating = parseInt(ratingSelect.value);
            }
            
            const increaseSelect = document.getElementById('rating-increase');
            if (increaseSelect.value === 'custom') {
                const inc = parseInt(document.getElementById('increase-custom-value').value) || 15;
                settings.ratingIncrease = Math.min(1000, Math.max(0, inc));
            } else {
                settings.ratingIncrease = parseInt(increaseSelect.value);
            }
            
            settings.currentRating = settings.startRating;

            // Sound settings
            settings.soundMoves = document.getElementById('sound-moves-cb').checked;
            settings.soundEffects = document.getElementById('sound-effects-cb').checked;

            // Extended settings
            const bonusSelect = document.getElementById('bonus-time');
            if (bonusSelect.value === 'custom') {
                settings.bonusTime = Math.min(60, Math.max(0, parseInt(document.getElementById('bonus-custom-value').value) || 0));
            } else {
                settings.bonusTime = parseInt(bonusSelect.value) || 0;
            }

            settings.errorBehavior = document.getElementById('error-behavior').value;

            settings.tipstemas = document.getElementById('tips-temas-cb').checked;
            settings.tipsPiece = document.getElementById('tips-piece-cb').checked;

            settings.colorChoice = document.getElementById('color-choice').value;

            // For 'random': decide once per game session (all white or all black)
            if (settings.colorChoice === 'random') {
                settings._randomColor = Math.random() < 0.5 ? 'white' : 'black';
            }

            settings.showRating = document.getElementById('show-rating').value === '1';

            // Piece count filter
            settings.pieceCountMin = parseInt(document.getElementById('piece-count-min').value);
            settings.pieceCountMax = parseInt(document.getElementById('piece-count-max').value);

            // Theme filter settings
            const checkedThemes = Array.from(document.querySelectorAll('.theme-checkbox:checked'))
                .map(cb => cb.value);
            settings.themeFilter = checkedThemes;
            settings.themeMatchAll = document.querySelector('input[name="theme-match"]:checked').value === 'all';

            // Override start rating for Stufen mode
            const stappenLevels = checkedThemes.filter(t => t.startsWith('stufe'));
            if (stappenLevels.length > 0) {
                const highestLevel = stappenLevels.sort().pop();
                const [minRating, ] = STUFEN_RATINGS[highestLevel];
                settings.currentRating = minRating;
            }

            // Set animation duration based on mode
            settings.animationDuration = getAnimationDuration();

            // Persist settings to localStorage
            saveSettings();

            if (settings.soundMoves || settings.soundEffects) {
                initAudio();
            }
            
            // Reset state
            solved = 0;
            errors = 0;
            timeLeft = settings.timeLimit;
            gameActive = true;
            selectedSquare = null;
            lastMoveFrom = null;
            lastMoveTo = null;
            usedpuzzle.clear();
            cleanupDrag();
            
            // Reset puzzle tracking for review
            playedpuzzle = [];
            performanceResults = [];
            currentpuzzletartTime = 0;
            currentPuzzleAttempts = 0;
            currentPuzzleWrongMoves = [];
            currentPuzzleUniqueErrors.clear();
            currentPuzzleUsedThemeHint = false;
            currentPuzzleUsedPieceHint = false;
            document.getElementById('skip-btn').style.display = 'none';
            
            // Update display
            document.getElementById('solved').textContent = '0';
            const maxErrors = settings.maxErrors === 0 ? '\u221e' : settings.maxErrors;
            document.getElementById('errors').textContent = '0/' + maxErrors;
            document.getElementById('current-rating').textContent = settings.currentRating;
            updateTimerDisplay();

            // Show/hide rating display
            const ratingBox = document.getElementById('current-rating').closest('.stat-box');
            if (ratingBox) ratingBox.style.display = settings.showRating ? '' : 'none';

            // Show/hide hint buttons
            document.getElementById('help-themes-btn').style.display = settings.tipstemas ? '' : 'none';
            document.getElementById('help-piece-btn').style.display = settings.tipsPiece ? '' : 'none';
            
            // Switch screens
            document.getElementById('setup-screen').classList.remove('active');
            document.getElementById('game-screen').classList.add('active');
            
            // Start timer
            if (settings.timeLimit > 0) {
                timerInterval = setInterval(updateTimer, 1000);
            } else {
                document.getElementById('timer').textContent = '\u221e';
            }
            
            // Load first puzzle - check if successful
            const puzzleLoaded = loadNextPuzzle();
            if (!puzzleLoaded) {
                // No puzzle available - abort game start
                gameActive = false;
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
                document.getElementById('game-screen').classList.remove('active');
                document.getElementById('setup-screen').classList.add('active');
            }
        }
        
        function updateTimer() {
            if (!gameActive) return;
            
            timeLeft--;
            updateTimerDisplay();
            
            if (timeLeft <= 0) {
                playTimeUpSound();
                endGame();
            }
        }
        
        function updateTimerDisplay() {
            const timerEl = document.getElementById('timer');
            
            if (settings.timeLimit === 0) {
                timerEl.textContent = '\u221e';
                return;
            }
            
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerEl.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
            
            // Remove previous countdown classes
            timerEl.classList.remove('countdown-warning', 'countdown-critical');
            
            if (timeLeft <= TIMER_THRESHOLDS.CRITICAL) {
                timerEl.style.color = 'var(--accent-red)';
                timerEl.classList.add('countdown-critical');
            } else if (timeLeft <= TIMER_THRESHOLDS.WARNING) {
                timerEl.style.color = 'var(--accent-warning)';
                timerEl.classList.add('countdown-warning');
            } else {
                timerEl.style.color = 'var(--accent-red-id)';
            }
        }
        
        function endGame() {
            gameActive = false;
            cleanupDrag();
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            
            // Save current puzzle if in progress (time ran out)
            if (currentPuzzle && currentpuzzletartTime > 0) {
                const timeSpent = (Date.now() - currentpuzzletartTime) / 1000;
                playedpuzzle.push({
                    puzzle: currentPuzzle,
                    solved: false,
                    attempts: currentPuzzleAttempts,
                    timeSpent: timeSpent,
                    wrongMoves: [...currentPuzzleWrongMoves]
                });
                // Record for performance rating (failed - timed out)
                recordPuzzlePerformance(currentPuzzle[3], false, timeSpent, currentPuzzleAttempts);
                currentpuzzletartTime = 0;
            }
            
            document.getElementById('final-score').textContent = solved;
            
            // Calculate and show performance rating
            const perfRating = calculatePerformanceRating();
            let statsHtml = t('puzzleSolved') + '<br>' +
                '<span style="font-size: 0.9em;">' + t('highestRating') + Math.round(settings.currentRating) + '</span>';
            if (perfRating !== null && performanceResults.length >= 3) {
                statsHtml += '<br><span style="font-size: 0.9em; color: var(--accent-red-id);">Performance Rating: ~' + perfRating + '</span>';
            }
            document.getElementById('stats-summary').innerHTML = statsHtml;
            
            // Save and display highscore comparison
            renderHighscoreComparison();
            
            document.getElementById('game-over').classList.add('active');
        }
        
        function resetGame() {
            document.getElementById('game-over').classList.remove('active');
            document.getElementById('review-screen').classList.remove('active');
            document.getElementById('review-detail').classList.remove('active');
            document.getElementById('daily-result').classList.remove('active');
            if (dailyMode) { startDailyPuzzle(); } else { startGame(); }
        }
        
        function backToSettings() {
            sfTerminate(); // PP_32: Stockfish Worker beenden
            document.getElementById('game-over').classList.remove('active');
            document.getElementById('review-screen').classList.remove('active');
            document.getElementById('review-detail').classList.remove('active');
            document.getElementById('game-screen').classList.remove('active');
            document.getElementById('daily-result').classList.remove('active');
            document.getElementById('setup-screen').classList.add('active');
            dailyMode = false;
            dailyPuzzleId = null;
        }
        
        // =====================================================
        // DAILY PUZZLE MODE
        // =====================================================
        
        // Curated daily puzzle -- full data, independent of main puzzle array
        // Format: [ID, FEN, Moves, Rating, Themes]
        
        function getDailyPuzzle() {
            const now = new Date();
            // Use year + day of year for consistent local date-based selection
            const start = new Date(now.getFullYear(), 0, 0);
            const diff = now - start;
            const oneDay = 86400000;
            const dayOfYear = Math.floor(diff / oneDay);
            const seed = now.getFullYear() * 1000 + dayOfYear;
            return DAILY_puzzle[seed % DAILY_puzzle.length];
        }
        
        function initDailyCard() {
            const puzzle = getDailyPuzzle();
            const now = new Date();
            const dateStr = now.toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US', { day: 'numeric', month: 'short' });
            document.getElementById('daily-link-text').textContent = 
                ' \u00b7 ' + dateStr;
        }
        
        function startDailyPuzzle() {
            sfTerminate(); // PP_32: Stockfish Worker beenden
            const puzzle = getDailyPuzzle();

            dailyMode = true;
            dailyPuzzleId = puzzle[0];
            
            // Configure daily settings
            settings.timeLimit = 0; // No timer
            settings.maxErrors = 0; // Unlimited errors
            settings.startRating = puzzle[3];
            settings.ratingIncrease = 0;
            settings.currentRating = puzzle[3];
            settings.soundMoves = document.getElementById('sound-moves-cb').checked;
            settings.soundEffects = document.getElementById('sound-effects-cb').checked;
            settings.tipstemas = document.getElementById('tips-temas-cb').checked;
            settings.tipsPiece = document.getElementById('tips-piece-cb').checked;
            settings.showRating = document.getElementById('show-rating').value === '1';
            settings.errorBehavior = 'retry'; // Daily always retry
            settings.bonusTime = 0;
            settings.colorChoice = 'mixed';
            settings.themeFilter = [];
            settings.themeMatchAll = false;
            settings.pieceCountMin = 3;
            settings.pieceCountMax = 32;
            settings.animationDuration = getAnimationDuration();

            if (settings.soundMoves || settings.soundEffects) {
                initAudio();
            }

            // Reset state
            solved = 0;
            errors = 0;
            timeLeft = 0;
            gameActive = true;
            selectedSquare = null;
            lastMoveFrom = null;
            lastMoveTo = null;
            usedpuzzle.clear();
            cleanupDrag();
            
            playedpuzzle = [];
            performanceResults = [];
            currentpuzzletartTime = 0;
            currentPuzzleAttempts = 0;
            currentPuzzleWrongMoves = [];
            currentPuzzleUniqueErrors.clear();
            currentPuzzleUsedThemeHint = false;
            currentPuzzleUsedPieceHint = false;
            
            // Switch screens
            document.getElementById('setup-screen').classList.remove('active');
            document.getElementById('game-screen').classList.add('active');
            
            // Update display for daily mode
            document.getElementById('solved').textContent = '0';
            document.getElementById('errors').textContent = '0/\u221e';
            document.getElementById('current-rating').textContent = puzzle[3];
            document.getElementById('timer').textContent = '\u221e';
            document.getElementById('skip-btn').style.display = 'none';

            // Show/hide rating display
            const ratingBox = document.getElementById('current-rating').closest('.stat-box');
            if (ratingBox) ratingBox.style.display = settings.showRating ? '' : 'none';

            // Show/hide hint buttons
            document.getElementById('help-themes-btn').style.display = settings.tipstemas ? '' : 'none';
            document.getElementById('help-piece-btn').style.display = settings.tipsPiece ? '' : 'none';
            
            // Load specific puzzle directly
            loadDailyPuzzle(puzzle);
        }
        
        function loadDailyPuzzle(puzzle) {
            currentpuzzletartTime = Date.now();
            currentPuzzleAttempts = 0;
            currentPuzzleWrongMoves = [];
            currentPuzzleUniqueErrors.clear();
            currentPuzzleUsedThemeHint = false;
            currentPuzzleUsedPieceHint = false;
            document.getElementById('skip-btn').style.display = 'none';
            document.querySelector('.move-input-container').classList.remove('visible');
            document.getElementById('move-input').value = '';
            clearHint();
            
            currentPuzzle = puzzle;
            usedpuzzle.add(puzzle[0]);
            
            const [id, fen, moves, rating, themes] = puzzle;
            
            puzzleMoves = moves.split(' ');
            if (puzzleMoves.length < 2) {
                showTemporaryAlert(t('invalidPuzzle'));
                return;
            }
            
            moveIndex = 0;
            
            try {
                game = new Chess(fen);
            } catch (e) {
                showTemporaryAlert(t('invalidPosition'));
                return;
            }
            
            const setupColor = game.turn();
            playerColor = setupColor === 'w' ? 'b' : 'w';
            
            renderBoard();
            
            document.getElementById('current-rating').textContent = rating;
            setFeedback('...', 'neutral');
            
            // Execute opponent's first move
            const firstUci = puzzleMoves[0];
            const firstMove = makeUCIMove(firstUci);
            if (!firstMove) {
                showTemporaryAlert(t('invalidMove'));
                return;
            }
            moveIndex = 1;
            renderBoard();
            setFeedback(t('findBestMove'), 'neutral');
            updateProgress();
        }
        
        function showDailyResult(wasSolved) {
            const timeSpent = playedpuzzle.length > 0 ? playedpuzzle[0].timeSpent : 0;
            const attempts = playedpuzzle.length > 0 ? playedpuzzle[0].attempts : 0;
            const puzzle = currentPuzzle;
            
            const resultEl = document.getElementById('daily-result');
            const rating = puzzle[3];
            const themes = formatThemes(puzzle[4]);
            
            let emoji = wasSolved ? '\u2713' : '\u2717';
            let title = wasSolved ? t('dailySolved') : t('dailyUnsolved');
            let titleColor = wasSolved ? 'var(--accent-green)' : 'var(--accent-red)';
            
            let starsHtml = '';
            if (wasSolved) {
                const wrongCount = attempts - 1; // attempts includes the final correct one
                const stars = wrongCount === 0 ? 3 : wrongCount <= 2 ? 2 : 1;
                starsHtml = '<div style="font-size:2rem;margin:8px 0;">' + 
                    '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars) + '</div>';
            }
            
            document.getElementById('daily-result-content').innerHTML = `
                <div style="font-size:3rem;margin-bottom:4px;">${emoji}</div>
                <h2 style="color:${titleColor};margin-bottom:8px;">${title}</h2>
                ${starsHtml}
                <div style="color:var(--text-secondary);margin:12px 0;">
                    Rating: <strong>${rating}</strong><br>
                    ${t('dailyThemes')}${themes}<br>
                    ${wasSolved ? t('dailyTime') + formatTime(timeSpent) + '<br>' : ''}
                    ${attempts > 1 ? t('dailyMistakes') + (attempts - 1) : t('dailyFirstTry')}
                </div>
            `;
            
            document.getElementById('game-screen').classList.remove('active');
            resultEl.classList.add('active');
        }

        // Initialize daily card on load
        document.addEventListener('DOMContentLoaded', function() {
            applyLanguage();
            initDailyCard();
        });
        
        function setFeedback(text, type) {
            const feedback = document.getElementById('feedback');
            feedback.innerHTML = text;
            feedback.className = 'feedback ' + type;
        }
        
        function showTemporaryAlert(message) {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            `;
            
            const box = document.createElement('div');
            box.style.cssText = `
                background: var(--bg-panel);
                padding: 24px 32px;
                border-radius: 8px;
                text-align: center;
                font-size: 1.1rem;
                color: var(--text-primary);
                max-width: 80%;
            `;
            box.textContent = message;
            
            overlay.appendChild(box);
            document.body.appendChild(overlay);
            
            // Close on click
            overlay.addEventListener('click', () => overlay.remove());
            
            // Auto-close after delay
            setTimeout(() => {
                if (overlay.parentNode) overlay.remove();
            }, ANIMATION.ALERT_AUTO_CLOSE);
        }
        
        
        // =====================================================
        // REVIEW SCREEN
        // =====================================================
        
        function showReviewScreen() {
            document.getElementById('game-over').classList.remove('active');
            document.getElementById('game-screen').classList.remove('active');
            document.getElementById('daily-result').classList.remove('active');
            document.getElementById('review-screen').classList.add('active');
            
            const totalCount = playedpuzzle.length;
            const solvedCount = playedpuzzle.filter(p => p.solved).length;
            const failedCount = totalCount - solvedCount;
            
            document.getElementById('review-total').textContent = totalCount;
            document.getElementById('review-solved').textContent = solvedCount;
            document.getElementById('review-failed').textContent = failedCount;
            
            reviewState.filter = 'all';
            reviewState.view = 'grid';
            reviewState.sort = 'number';
            
            document.querySelectorAll('.review-filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === 'all');
            });
            document.querySelectorAll('.review-sort-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.sort === 'number');
            });
            document.querySelectorAll('.review-view-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === 'grid');
            });
            
            renderReviewContent();
        }
        
        function setReviewFilter(filter) {
            reviewState.filter = filter;
            document.querySelectorAll('.review-filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === filter);
            });
            renderReviewContent();
        }
        
        function setReviewSort(sort) {
            reviewState.sort = sort;
            document.querySelectorAll('.review-sort-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.sort === sort);
            });
            renderReviewContent();
        }
        
        function setReviewView(view) {
            reviewState.view = view;
            document.querySelectorAll('.review-view-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === view);
            });
            renderReviewContent();
        }
        
        function getFilteredpuzzle() {
            let puzzle;
            if (reviewState.filter === 'solved') {
                puzzle = playedpuzzle.filter(p => p.solved);
            } else if (reviewState.filter === 'failed') {
                puzzle = playedpuzzle.filter(p => !p.solved);
            } else {
                puzzle = [...playedpuzzle];
            }
            
            // Sortierung anwenden
            if (reviewState.sort === 'number') {
                // Originalreihenfolge (aufsteigend nach Index)
                puzzle.sort((a, b) => playedpuzzle.indexOf(a) - playedpuzzle.indexOf(b));
            } else if (reviewState.sort === 'rating') {
                // H\u00f6chstes Rating zuerst
                puzzle.sort((a, b) => b.puzzle[3] - a.puzzle[3]);
            } else if (reviewState.sort === 'time') {
                // L\u00e4ngste Zeit zuerst
                puzzle.sort((a, b) => b.timeSpent - a.timeSpent);
            } else if (reviewState.sort === 'attempts') {
                // Meiste Versuche zuerst
                puzzle.sort((a, b) => b.attempts - a.attempts);
            }
            
            return puzzle;
        }
        
        function renderReviewContent() {
            const container = document.getElementById('review-content');
            const puzzle = getFilteredpuzzle();
            
            if (puzzle.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">' + t('nopuzzleFound') + '</div>';
                return;
            }
            
            if (reviewState.view === 'list') {
                renderReviewList(container, puzzle);
            } else {
                renderReviewGrid(container, puzzle);
            }
        }
        
        function renderReviewList(container, puzzle) {
            let html = '<div class="review-list">';
            
            puzzle.forEach((item, index) => {
                const originalIndex = playedpuzzle.indexOf(item);
                const puzzle = item.puzzle;
                const statusClass = item.solved ? 'solved' : 'failed';
                const statusIcon = item.solved ? '\u2713' : '\u2717';
                const themes = formatThemes(puzzle[4]);
                const time = formatTime(item.timeSpent);
                const miniBoard = createListMiniBoard(puzzle[1]);
                const attemptText = item.attempts === 0 ? t('attempts0') :
                                   item.attempts === 1 ? t('attempt1') :
                                   item.attempts + ' ' + t('attemptsN');
                
                html += '<div class="review-list-item ' + statusClass + '" onclick="openReviewDetail(' + originalIndex + ')">';
                html += miniBoard;
                html += '<span class="review-item-number">#' + (originalIndex + 1) + '</span>';
                html += '<span class="review-item-status">' + statusIcon + '</span>';
                html += '<span class="review-item-rating">' + puzzle[3] + '</span>';
                html += '<div class="review-item-info">';
                html += '<span class="review-item-themes">' + themes + '</span>';
                html += '<span class="review-item-stats">' + attemptText + ' \u2022 ' + time + '</span>';
                html += '</div></div>';
            });
            
            html += '</div>';
            container.innerHTML = html;
        }
        
        function renderReviewGrid(container, puzzle) {
            let html = '<div class="review-grid">';
            
            puzzle.forEach((item, index) => {
                const originalIndex = playedpuzzle.indexOf(item);
                const puzzle = item.puzzle;
                const statusClass = item.solved ? 'solved' : 'failed';
                const miniBoard = createMiniBoard(puzzle[1], puzzle[2]);
                const time = formatTime(item.timeSpent);
                // Gel\u00f6st = gr\u00fcn, nicht gel\u00f6st = rot
                const attemptsClass = item.solved ? 'solved' : 'failed';
                
                html += '<div class="review-grid-item ' + statusClass + '" onclick="openReviewDetail(' + originalIndex + ')">';
                html += miniBoard;
                html += '<div class="review-grid-info">';
                html += '<span>' + puzzle[3] + '</span>';
                html += '<span>' + time + '</span>';
                html += '<span class="review-grid-attempts ' + attemptsClass + '">' + item.attempts + '</span>';
                html += '</div></div>';
            });
            
            html += '</div>';
            container.innerHTML = html;
        }
        
        function createMiniBoard(fen, moves) {
            const tempGame = new Chess(fen);
            
            // Determine player color (opposite of initial turn) and flip
            const setupColor = tempGame.turn();
            const playerColor = setupColor === 'w' ? 'b' : 'w';
            const isFlipped = playerColor === 'b';
            
            // Play the first opponent move to show the puzzle start position
            if (moves) {
                const moveList = moves.split(' ');
                if (moveList.length > 0) {
                    const firstUci = moveList[0];
                    tempGame.move({
                        from: firstUci.substring(0, 2),
                        to: firstUci.substring(2, 4),
                        promotion: firstUci.length > 4 ? firstUci[4] : undefined
                    });
                }
            }
            
            let html = '<div class="review-mini-board">';
            
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const actualRow = isFlipped ? 7 - row : row;
                    const actualCol = isFlipped ? 7 - col : col;
                    const file = 'abcdefgh'[actualCol];
                    const rank = 8 - actualRow;
                    const square = file + rank;
                    const colorClass = (actualRow + actualCol) % 2 === 0 ? 'light' : 'dark';
                    
                    const piece = tempGame.get(square);
                    let pieceHtml = '';
                    if (piece) {
                        const pieceKey = (piece.color === 'w' ? 'w' : 'b') + piece.type.toUpperCase();
                        pieceHtml = PIECE_SVG[pieceKey];
                    }
                    
                    html += '<div class="review-mini-square ' + colorClass + '">' + pieceHtml + '</div>';
                }
            }
            
            html += '</div>';
            return html;
        }
        
        function createListMiniBoard(fen) {
            const tempGame = new Chess(fen);
            let html = '<div class="review-list-mini-board">';
            
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const file = 'abcdefgh'[col];
                    const rank = 8 - row;
                    const square = file + rank;
                    const colorClass = (row + col) % 2 === 0 ? 'light' : 'dark';
                    
                    const piece = tempGame.get(square);
                    let pieceHtml = '';
                    if (piece) {
                        const pieceKey = (piece.color === 'w' ? 'w' : 'b') + piece.type.toUpperCase();
                        pieceHtml = PIECE_SVG[pieceKey];
                    }
                    
                    html += '<div class="mini-sq ' + colorClass + '">' + pieceHtml + '</div>';
                }
            }
            
            html += '</div>';
            return html;
        }
        
        function formatThemes(themesStr) {
            const themeList = themesStr.split(' ');
            const germanNames = [];
            const addedConsolidated = new Set();
            
            for (const theme of themeList) {
                // Check if this is a sub-theme that maps to a consolidated mate theme
                const consolidatedKey = REVERSE_MATE_MAPPINGS[theme.toLowerCase()];
                if (consolidatedKey && !addedConsolidated.has(consolidatedKey)) {
                    for (const [category, catThemes] of Object.entries(getPuzzleThemes())) {
                        if (catThemes[consolidatedKey]) {
                            germanNames.push(catThemes[consolidatedKey]);
                            addedConsolidated.add(consolidatedKey);
                            break;
                        }
                    }
                    continue;
                }
                if (consolidatedKey && addedConsolidated.has(consolidatedKey)) continue;
                
                let found = false;
                for (const [category, themes] of Object.entries(getPuzzleThemes())) {
                    if (themes[theme]) {
                        germanNames.push(themes[theme]);
                        found = true;
                        break;
                    }
                }
            }
            
            return germanNames.length > 0 ? germanNames.join(', ') : '-';
        }
        
        function formatTime(seconds) {
            if (!seconds || seconds < 0) return '0:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return mins + ':' + (secs < 10 ? '0' : '') + secs;
        }
        
        // =====================================================
        // REVIEW DETAIL - Interactive Puzzle
        // =====================================================
        
        function openReviewDetail(index) {
            reviewState.currentIndex = index;
            const item = playedpuzzle[index];
            const puzzle = item.puzzle;
            
            document.getElementById('review-detail-title').textContent = 'Puzzle #' + (index + 1);
            const statusEl = document.getElementById('review-detail-status');
            statusEl.innerHTML = item.solved ? t('reviewSolvedStatus') : t('reviewUnsolvedStatus');
            statusEl.className = 'review-detail-status ' + (item.solved ? 'solved' : 'failed');
            
            document.getElementById('review-detail-rating').textContent = puzzle[3];
            document.getElementById('review-detail-themes').textContent = formatThemes(puzzle[4]);
            document.getElementById('review-detail-attempts').textContent = item.attempts;
            document.getElementById('review-detail-time').textContent = formatTime(item.timeSpent);
            document.getElementById('review-lichess-link').href = 'https://lichess.org/training/' + puzzle[0];
            
            // Setup game for interactive solving
            const [id, fen, moves, rating, themes] = puzzle;
            reviewState.game = new Chess(fen);
            reviewState.moves = moves.split(' ');
            reviewState.moveIndex = 0;
            reviewState.puzzleolved = false;
            reviewState.solutionVisible = false;
            reviewState.selectedSquare = null;
            reviewState.lastMoveFrom = null;
            reviewState.lastMoveTo = null;

            // PP_32: Modus auf Lösung zurücksetzen (ohne Board-Render)
            sfStop();
            reviewState.mode = 'solution';
            analysisState.game = null;
            analysisState.history = [];
            analysisState.index = -1;
            analysisState.selectedSquare = null;
            document.querySelectorAll('.review-mode-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('mode-btn-solution') && document.getElementById('mode-btn-solution').classList.add('active');
            document.getElementById('analysis-controls') && document.getElementById('analysis-controls').classList.add('hidden');
            document.getElementById('stockfish-panel') && document.getElementById('stockfish-panel').classList.add('hidden');
            document.getElementById('eval-bar') && document.getElementById('eval-bar').classList.add('hidden');
            document.getElementById('review-detail-board-section') && document.getElementById('review-detail-board-section').classList.remove('with-eval');

            // Make opponent's first move
            const firstMove = reviewState.moves[0];
            reviewState.game.move({
                from: firstMove.substring(0, 2),
                to: firstMove.substring(2, 4),
                promotion: firstMove.length > 4 ? firstMove[4] : undefined
            });
            reviewState.moveIndex = 1;
            reviewState.lastMoveFrom = firstMove.substring(0, 2);
            reviewState.lastMoveTo = firstMove.substring(2, 4);
            
            // Determine player color
            const setupColor = new Chess(fen).turn();
            reviewState.playerColor = setupColor === 'w' ? 'b' : 'w';
            
            // Hide solution
            document.getElementById('review-solution').classList.add('hidden');
            
            // Render solution moves (without first opponent move)
            renderReviewSolution(reviewState.moves.slice(1), fen);
            
            // Set feedback
            setReviewFeedback(t('findBestMove'), 'neutral');
            
            // Render board
            renderReviewBoard();
            updateReviewTurnIndicator();
            
            // Setup touch handlers for review board (und Analyse-Board)
            setupReviewBoardTouchHandlers();
            analysisTouch.setup();

            // Update navigation
            updateReviewNavButtons();
            
            document.getElementById('review-detail').classList.add('active');
        }
        
        function closeReviewDetail() {
            if (reviewState.playInterval) {
                clearInterval(reviewState.playInterval);
                reviewState.playInterval = null;
            }
            sfStop(); // PP_32: Stockfish-Analyse stoppen
            document.getElementById('review-detail').classList.remove('active');
        }
        
        function setReviewFeedback(text, type) {
            const feedback = document.getElementById('review-feedback');
            feedback.innerHTML = text;
            feedback.className = 'review-feedback' + (text ? ' ' + type : '');
        }

        function clearReviewFeedback() {
            const feedback = document.getElementById('review-feedback');
            if (!feedback) return;
            feedback.innerHTML = '';
            feedback.className = 'review-feedback';
        }

        // Zeigt Schachmatt/Remis im Feedback-Feld, sofern die Partie zu Ende ist.
        // Wird im Analyse- und Stockfish-Modus genutzt.
        function updateAnalysisGameOverFeedback() {
            if (!analysisState.game) { clearReviewFeedback(); return; }
            if (analysisState.game.in_checkmate()) {
                setReviewFeedback(t('checkmateMsg'), 'solved');
            } else if (analysisState.game.in_draw() || analysisState.game.in_stalemate() ||
                       analysisState.game.in_threefold_repetition() ||
                       analysisState.game.insufficient_material()) {
                setReviewFeedback(t('drawMsg'), 'solved');
            } else {
                clearReviewFeedback();
            }
        }
        
        function renderReviewSolution(moves, fen) {
            const container = document.getElementById('review-solution-moves');
            let html = '';
            
            const tempGame = new Chess(fen);
            // Make first opponent move to get to puzzle start position
            const firstOppMove = reviewState.moves[0];
            tempGame.move({
                from: firstOppMove.substring(0, 2),
                to: firstOppMove.substring(2, 4),
                promotion: firstOppMove.length > 4 ? firstOppMove[4] : undefined
            });
            
            // Always start with move number 1
            let moveNum = 1;
            let isWhiteTurn = tempGame.turn() === 'w';
            
            // If Black moves first, show "1..."
            if (!isWhiteTurn && moves.length > 0) {
                html += '<span style="color: var(--text-secondary)">1...</span> ';
            }
            
            for (let i = 0; i < moves.length; i++) {
                const uci = moves[i];
                const from = uci.substring(0, 2);
                const to = uci.substring(2, 4);
                const promotion = uci.length > 4 ? uci[4] : undefined;
                
                if (isWhiteTurn) {
                    html += '<span style="color: var(--text-secondary)">' + moveNum + '.</span> ';
                }
                
                const moveObj = tempGame.move({ from, to, promotion });
                if (!moveObj) continue;
                
                const san = convertNotation(moveObj.san);
                const colorClass = isWhiteTurn ? '' : 'black-move';
                
                html += '<span class="review-solution-move ' + colorClass + '" data-move="' + i + '">' + san + '</span> ';
                
                if (!isWhiteTurn) {
                    moveNum++;
                }
                isWhiteTurn = !isWhiteTurn;
            }
            
            container.innerHTML = html;
            
            // Add click handlers for solution moves
            container.querySelectorAll('.review-solution-move').forEach(el => {
                el.addEventListener('click', () => {
                    if (reviewState.solutionVisible) {
                        reviewGoToMove(parseInt(el.dataset.move));
                    }
                });
            });
        }
        
        function convertNotation(san) {
            if (currentLang === 'de') {
                return san
                    .replace(/^K/, 'K')
                    .replace(/^Q/, 'D')
                    .replace(/^R/, 'T')
                    .replace(/^B/, 'L')
                    .replace(/^N/, 'S');
            }
            return san;
        }
        

        function renderReviewBoard() {
            renderBoardGeneric({
                boardId: 'review-board',
                chessGame: reviewState.game,
                isFlipped: reviewState.playerColor === 'b',
                selectedSquare: reviewState.selectedSquare,
                lastMoveFrom: reviewState.lastMoveFrom,
                lastMoveTo: reviewState.lastMoveTo,
                canInteract: !reviewState.puzzleolved && !reviewState.solutionVisible,
                playerColor: reviewState.playerColor,
                showValidMoves: !reviewState.puzzleolved && !reviewState.solutionVisible && reviewState.game && reviewState.game.turn() === reviewState.playerColor,
                hintSquare: null,
                onSquareClick: handleReviewSquareClick,
                onDragStart: reviewDrag.start
            });
        }
        
        function handleReviewSquareClick(square, event) {
            if (reviewDrag.isDragging()) {
                reviewDrag.resetDrag();
                return;
            }
            
            if (reviewState.puzzleolved || reviewState.solutionVisible) return;
            if (reviewState.game.turn() !== reviewState.playerColor) return;
            
            const piece = reviewState.game.get(square);
            
            if (reviewState.selectedSquare) {
                // Deselect if clicking the same piece again
                if (reviewState.selectedSquare === square) {
                    reviewState.selectedSquare = null;
                    renderReviewBoard();
                    return;
                }
                // Try to make a move
                const expectedUCI = reviewState.moves[reviewState.moveIndex];
                const playerUCI = reviewState.selectedSquare + square;
                
                // Check if it's a promotion
                const movingPiece = reviewState.game.get(reviewState.selectedSquare);
                let promotion = null;
                if (movingPiece && movingPiece.type === 'p') {
                    const targetRank = square[1];
                    if ((movingPiece.color === 'w' && targetRank === '8') || 
                        (movingPiece.color === 'b' && targetRank === '1')) {
                        // Verify that this pawn move is actually legal before auto-promoting
                        const legalMoves = reviewState.game.moves({ square: reviewState.selectedSquare, verbose: true });
                        const isLegalPromotion = legalMoves.some(m => m.to === square && m.flags.includes('p'));
                        if (isLegalPromotion) {
                            promotion = 'q';
                        }
                    }
                }
                
                const fullUCI = playerUCI + (promotion || '');
                
                if (fullUCI === expectedUCI || playerUCI === expectedUCI.substring(0, 4)) {
                    // Correct move - play sound
                    const captured = reviewState.game.get(square);
                    const actualPromotion = expectedUCI.length > 4 ? expectedUCI[4] : promotion;
                    
                    // Detect castling: king moving 2 files
                    let moveFlags = '';
                    if (movingPiece.type === 'k' && Math.abs(reviewState.selectedSquare.charCodeAt(0) - square.charCodeAt(0)) === 2) {
                        moveFlags = square.charCodeAt(0) > reviewState.selectedSquare.charCodeAt(0) ? 'k' : 'q';
                    }
                    
                    // Non-invasive check detection: test the move on a clone so we
                    // don't disturb reviewState.game before the real move below.
                    let isCheckMove = false;
                    try {
                        const cloneGame = new Chess(reviewState.game.fen());
                        const cloneResult = cloneGame.move({
                            from: reviewState.selectedSquare,
                            to: square,
                            promotion: actualPromotion
                        });
                        isCheckMove = !!(cloneResult && cloneGame.in_check());
                    } catch (e) {}
                    
                    playMoveSound(movingPiece.type, reviewState.selectedSquare, square, captured ? captured.type : null, {
                        flags: moveFlags,
                        promotion: actualPromotion,
                        isCheck: isCheckMove
                    });
                    
                    reviewState.game.move({
                        from: reviewState.selectedSquare,
                        to: square,
                        promotion: actualPromotion
                    });
                    reviewState.moveIndex++;
                    reviewState.selectedSquare = null;

                    if (reviewState.moveIndex >= reviewState.moves.length) {
                        // Puzzle complete!
                        reviewState.puzzleolved = true;
                        setReviewFeedback(t('solvedMsg'), 'solved');
                    } else {
                        setReviewFeedback(t('findBestMove'), 'neutral');
                        // Make opponent's response with animation
                        setTimeout(() => {
                            const oppMove = reviewState.moves[reviewState.moveIndex];
                            const oppFrom = oppMove.substring(0, 2);
                            const oppTo = oppMove.substring(2, 4);
                            const oppPromotion = oppMove.length > 4 ? oppMove[4] : undefined;

                            const oppPiece = reviewState.game.get(oppFrom);
                            if (oppPiece) {
                                const oppPieceKey = (oppPiece.color === 'w' ? 'w' : 'b') + oppPiece.type.toUpperCase();
                                animateReviewMove(oppFrom, oppTo, oppPieceKey, () => {
                                    reviewState.game.move({ from: oppFrom, to: oppTo, promotion: oppPromotion });
                                    reviewState.moveIndex++;
                                    reviewState.lastMoveFrom = oppFrom;
                                    reviewState.lastMoveTo = oppTo;
                                    renderReviewBoard();
                                    updateReviewTurnIndicator();

                                    if (reviewState.moveIndex >= reviewState.moves.length) {
                                        reviewState.puzzleolved = true;
                                        setReviewFeedback(t('solvedMsg'), 'solved');
                                    }
                                });
                            } else {
                                reviewState.game.move({ from: oppFrom, to: oppTo, promotion: oppPromotion });
                                reviewState.moveIndex++;
                                reviewState.lastMoveFrom = oppFrom;
                                reviewState.lastMoveTo = oppTo;
                                renderReviewBoard();
                                updateReviewTurnIndicator();
                            }
                        }, 150);
                    }

                    renderReviewBoard();
                    updateReviewTurnIndicator();
                } else {
                    // Wrong move - play wrong sound
                    playWrongSound();
                    setReviewFeedback(t('wrongTryAgainMsg'), 'wrong');
                    reviewState.selectedSquare = null;
                    renderReviewBoard();
                }
            } else {
                // Select piece
                if (piece && piece.color === reviewState.playerColor) {
                    reviewState.selectedSquare = square;
                    renderReviewBoard();
                }
            }
        }

        
        function tryReviewMove(from, to, promotion) {
            if (reviewState.puzzleolved || reviewState.solutionVisible) return;
            
            const expectedUCI = reviewState.moves[reviewState.moveIndex];
            const playerUCI = from + to;
            
            // Check if it's a promotion
            const movingPiece = reviewState.game.get(from);
            if (movingPiece && movingPiece.type === 'p' && !promotion) {
                const targetRank = to[1];
                if ((movingPiece.color === 'w' && targetRank === '8') || 
                    (movingPiece.color === 'b' && targetRank === '1')) {
                    // Verify that this pawn move is actually legal before showing dialog
                    const legalMoves = reviewState.game.moves({ square: from, verbose: true });
                    const isLegalPromotion = legalMoves.some(m => m.to === to && m.flags.includes('p'));
                    if (isLegalPromotion) {
                        showReviewPromotionDialog(from, to);
                        return;
                    }
                }
            }
            
            const fullUCI = playerUCI + (promotion || '');
            
            // Check if this is the last move of the puzzle
            const isLastMove = (reviewState.moveIndex === reviewState.moves.length - 1);
            
            // First make the move to check for mate
            const testMove = reviewState.game.move({
                from: from,
                to: to,
                promotion: promotion || (expectedUCI.length > 4 ? expectedUCI[4] : undefined)
            });
            
            if (!testMove) {
                // Invalid move
                playWrongSound();
                setReviewFeedback(t('wrongTryAgainMsg'), 'wrong');
                reviewState.selectedSquare = null;
                renderReviewBoard();
                return;
            }
            
            // Check for checkmate (allows alternate mate solutions on last move)
            const isMate = reviewState.game.in_checkmate();
            
            // Normal correct move OR alternate checkmate on last move
            if ((fullUCI === expectedUCI || playerUCI === expectedUCI.substring(0, 4)) || (isLastMove && isMate)) {
                // Correct move - play sound
                const actualPromotion = testMove.promotion;

                playMoveSound(movingPiece.type, from, to, testMove.captured || null, {
                    flags: testMove.flags || '',
                    promotion: actualPromotion,
                    isCheck: reviewState.game.in_check()
                });
                
                reviewState.moveIndex++;
                reviewState.selectedSquare = null;

                if (reviewState.moveIndex >= reviewState.moves.length || (isLastMove && isMate)) {
                    reviewState.puzzleolved = true;
                    setReviewFeedback(t('solvedMsg'), 'solved');
                } else {
                    setReviewFeedback(t('findBestMove'), 'neutral');
                    setTimeout(() => {
                        const oppMove = reviewState.moves[reviewState.moveIndex];
                        const oppFrom = oppMove.substring(0, 2);
                        const oppTo = oppMove.substring(2, 4);
                        const oppPromotion = oppMove.length > 4 ? oppMove[4] : undefined;

                        const oppPiece = reviewState.game.get(oppFrom);
                        if (oppPiece) {
                            const oppPieceKey = (oppPiece.color === 'w' ? 'w' : 'b') + oppPiece.type.toUpperCase();
                            animateReviewMove(oppFrom, oppTo, oppPieceKey, () => {
                                reviewState.game.move({ from: oppFrom, to: oppTo, promotion: oppPromotion });
                                reviewState.moveIndex++;
                                reviewState.lastMoveFrom = oppFrom;
                                reviewState.lastMoveTo = oppTo;
                                renderReviewBoard();
                                updateReviewTurnIndicator();

                                if (reviewState.moveIndex >= reviewState.moves.length) {
                                    reviewState.puzzleolved = true;
                                    setReviewFeedback(t('solvedMsg'), 'solved');
                                }
                            });
                        } else {
                            reviewState.game.move({ from: oppFrom, to: oppTo, promotion: oppPromotion });
                            reviewState.moveIndex++;
                            reviewState.lastMoveFrom = oppFrom;
                            reviewState.lastMoveTo = oppTo;
                            renderReviewBoard();
                            updateReviewTurnIndicator();
                        }
                    }, 150);
                }

                renderReviewBoard();
                updateReviewTurnIndicator();
            } else {
                // Wrong move - undo and play wrong sound
                reviewState.game.undo();
                playWrongSound();
                setReviewFeedback(t('wrongTryAgainMsg'), 'wrong');
                reviewState.selectedSquare = null;
                renderReviewBoard();
            }
        }
        
        function showReviewPromotionDialog(from, to) {
            const piece = reviewState.game.get(from);
            if (!piece) return;
            
            pendingReviewPromotion = { from, to, color: piece.color };
            
            const dialog = document.getElementById('promotion-dialog');
            const colorPrefix = piece.color === 'w' ? 'w' : 'b';
            
            // Populate with correct colored pieces (order: Queen, Knight, Rook, Bishop)
            const options = dialog.querySelectorAll('.promotion-option');
            const pieces = ['Q', 'N', 'R', 'B'];
            const pieceData = ['q', 'n', 'r', 'b'];
            options.forEach((opt, i) => {
                opt.innerHTML = PIECE_SVG[colorPrefix + pieces[i]];
                opt.dataset.piece = pieceData[i];
            });
            
            // Get review board and calculate square size
            const board = document.getElementById('review-board');
            const boardRect = board.getBoundingClientRect();
            const squareSize = boardRect.width / 8;
            
            // Set dialog option size to match square size
            options.forEach(opt => {
                opt.style.width = squareSize + 'px';
                opt.style.height = squareSize + 'px';
            });
            
            // Calculate target square position
            const isFlipped = reviewState.playerColor === 'b';
            const fileIndex = to.charCodeAt(0) - 97; // 0-7
            const rankIndex = parseInt(to[1]) - 1; // 0-7
            
            const col = isFlipped ? 7 - fileIndex : fileIndex;
            const row = isFlipped ? rankIndex : 7 - rankIndex;
            
            const squareLeft = boardRect.left + col * squareSize;
            const squareTop = boardRect.top + row * squareSize;
            
            // Position dialog starting at the target square
            let left = squareLeft - 2;
            
            // User promotions are always at the top of the visual board
            // Dialog should always go DOWN into the board
            let top = squareTop - 2;
            
            dialog.style.left = left + 'px';
            dialog.style.top = top + 'px';
            dialog.classList.add('active');
        }
        
        function handleReviewPromotionChoice(piece) {
            if (!pendingReviewPromotion) return;
            
            const { from, to } = pendingReviewPromotion;
            hidePromotionDialog();
            pendingReviewPromotion = null;
            
            tryReviewMove(from, to, piece);
        }
        

        // Touch support for review board (using generic touch handler)
        function setupReviewBoardTouchHandlers() {
            reviewTouch.setup();
        }
        
        function updateReviewTurnIndicator() {
            const indicator = document.getElementById('review-turn-indicator');
            indicator.className = 'review-turn-indicator ' + (reviewState.game.turn() === 'w' ? 'white' : 'black');
        }
        
        function reviewGoToStart() {
            if (!reviewState.solutionVisible) return;

            const item = playedpuzzle[reviewState.currentIndex];
            const puzzle = item.puzzle;
            reviewState.game = new Chess(puzzle[1]);

            // Make first opponent move
            const firstMove = reviewState.moves[0];
            reviewState.game.move({
                from: firstMove.substring(0, 2),
                to: firstMove.substring(2, 4),
                promotion: firstMove.length > 4 ? firstMove[4] : undefined
            });
            reviewState.moveIndex = 1;
            reviewState.lastMoveFrom = firstMove.substring(0, 2);
            reviewState.lastMoveTo = firstMove.substring(2, 4);

            renderReviewBoard();
            updateReviewTurnIndicator();
            updateReviewMoveHighlight();
        }
        
        function reviewGoToEnd() {
            if (!reviewState.solutionVisible) return;

            const item = playedpuzzle[reviewState.currentIndex];
            const puzzle = item.puzzle;
            reviewState.game = new Chess(puzzle[1]);

            for (let i = 0; i < reviewState.moves.length; i++) {
                const uci = reviewState.moves[i];
                reviewState.game.move({
                    from: uci.substring(0, 2),
                    to: uci.substring(2, 4),
                    promotion: uci.length > 4 ? uci[4] : undefined
                });
            }

            reviewState.moveIndex = reviewState.moves.length;
            if (reviewState.moves.length > 0) {
                const lastUci = reviewState.moves[reviewState.moves.length - 1];
                reviewState.lastMoveFrom = lastUci.substring(0, 2);
                reviewState.lastMoveTo = lastUci.substring(2, 4);
            }
            renderReviewBoard();
            updateReviewTurnIndicator();
            updateReviewMoveHighlight();
        }
        
        function reviewPrevMove() {
            if (!reviewState.solutionVisible || reviewState.moveIndex <= 1) return;

            const item = playedpuzzle[reviewState.currentIndex];
            const puzzle = item.puzzle;
            reviewState.moveIndex--;

            // Rebuild position
            reviewState.game = new Chess(puzzle[1]);
            for (let i = 0; i < reviewState.moveIndex; i++) {
                const uci = reviewState.moves[i];
                reviewState.game.move({
                    from: uci.substring(0, 2),
                    to: uci.substring(2, 4),
                    promotion: uci.length > 4 ? uci[4] : undefined
                });
            }

            // Last applied move is reviewState.moves[reviewState.moveIndex - 1]
            const lastUci = reviewState.moves[reviewState.moveIndex - 1];
            reviewState.lastMoveFrom = lastUci.substring(0, 2);
            reviewState.lastMoveTo = lastUci.substring(2, 4);

            renderReviewBoard();
            updateReviewTurnIndicator();
            updateReviewMoveHighlight();
        }
        
        function reviewNextMove() {
            if (!reviewState.solutionVisible || reviewState.moveIndex >= reviewState.moves.length) return;

            const uci = reviewState.moves[reviewState.moveIndex];
            reviewState.lastMoveFrom = uci.substring(0, 2);
            reviewState.lastMoveTo = uci.substring(2, 4);
            reviewState.game.move({
                from: uci.substring(0, 2),
                to: uci.substring(2, 4),
                promotion: uci.length > 4 ? uci[4] : undefined
            });
            reviewState.moveIndex++;

            renderReviewBoard();
            updateReviewTurnIndicator();
            updateReviewMoveHighlight();
        }
        
        function reviewGoToMove(solutionMoveIndex) {
            if (!reviewState.solutionVisible) return;

            const item = playedpuzzle[reviewState.currentIndex];
            const puzzle = item.puzzle;

            const targetMoveIndex = solutionMoveIndex + 2;

            reviewState.game = new Chess(puzzle[1]);
            for (let i = 0; i < targetMoveIndex && i < reviewState.moves.length; i++) {
                const uci = reviewState.moves[i];
                reviewState.game.move({
                    from: uci.substring(0, 2),
                    to: uci.substring(2, 4),
                    promotion: uci.length > 4 ? uci[4] : undefined
                });
            }

            reviewState.moveIndex = Math.min(targetMoveIndex, reviewState.moves.length);
            if (reviewState.moveIndex > 0) {
                const lastUci = reviewState.moves[reviewState.moveIndex - 1];
                reviewState.lastMoveFrom = lastUci.substring(0, 2);
                reviewState.lastMoveTo = lastUci.substring(2, 4);
            }
            renderReviewBoard();
            updateReviewTurnIndicator();
            updateReviewMoveHighlight();
        }
        
        function reviewPlaySolution() {
            if (!reviewState.solutionVisible) return;
            
            if (reviewState.playInterval) {
                clearInterval(reviewState.playInterval);
                reviewState.playInterval = null;
                return;
            }
            
            if (reviewState.moveIndex >= reviewState.moves.length) {
                reviewGoToStart();
            }
            
            reviewState.playInterval = setInterval(() => {
                if (reviewState.moveIndex >= reviewState.moves.length) {
                    clearInterval(reviewState.playInterval);
                    reviewState.playInterval = null;
                    return;
                }
                reviewNextMove();
            }, 800);
        }
        
        function updateReviewMoveHighlight() {
            const currentSolutionIndex = reviewState.moveIndex - 2;
            document.querySelectorAll('.review-solution-move').forEach((el, i) => {
                el.classList.toggle('current', i === currentSolutionIndex);
            });
        }
        
        function updateReviewNavButtons() {
            const filteredpuzzle = getFilteredpuzzle();
            const currentInFiltered = filteredpuzzle.findIndex(p => playedpuzzle.indexOf(p) === reviewState.currentIndex);
            
            document.getElementById('review-prev-btn').disabled = currentInFiltered <= 0;
            document.getElementById('review-next-btn').disabled = currentInFiltered >= filteredpuzzle.length - 1;
        }
        
        function reviewPrevPuzzle() {
            const filteredpuzzle = getFilteredpuzzle();
            const currentInFiltered = filteredpuzzle.findIndex(p => playedpuzzle.indexOf(p) === reviewState.currentIndex);
            
            if (currentInFiltered > 0) {
                const prevItem = filteredpuzzle[currentInFiltered - 1];
                const prevIndex = playedpuzzle.indexOf(prevItem);
                if (reviewState.playInterval) {
                    clearInterval(reviewState.playInterval);
                    reviewState.playInterval = null;
                }
                openReviewDetail(prevIndex);
            }
        }
        
        function reviewNextPuzzle() {
            const filteredpuzzle = getFilteredpuzzle();
            const currentInFiltered = filteredpuzzle.findIndex(p => playedpuzzle.indexOf(p) === reviewState.currentIndex);
            
            if (currentInFiltered < filteredpuzzle.length - 1) {
                const nextItem = filteredpuzzle[currentInFiltered + 1];
                const nextIndex = playedpuzzle.indexOf(nextItem);
                if (reviewState.playInterval) {
                    clearInterval(reviewState.playInterval);
                    reviewState.playInterval = null;
                }
                openReviewDetail(nextIndex);
            }
        }

        // =====================================================
        // HIGHSCORE SYSTEM (localStorage)
        // Stores one highscore per settings combination, max 100 different combos
        // =====================================================
        const HIGHSCORE_KEY = 'kustompuzzle_highscores_v2';
        const HIGHSCORE_MAX_COMBOS = 100;
        
        function getSettingsKey() {
            // Create a unique key from the current settings combination
            return [
                settings.timeLimit,
                settings.startRating,
                settings.ratingIncrease,
                settings.maxErrors
            ].join('|');
        }
        
        function getHighscoreStore() {
            try {
                const data = localStorage.getItem(HIGHSCORE_KEY);
                return data ? JSON.parse(data) : {};
            } catch (e) {
                return {};
            }
        }
        
        function saveHighscoreStore(store) {
            try {
                // Enforce max combos limit - remove oldest entries if needed
                const keys = Object.keys(store);
                if (keys.length > HIGHSCORE_MAX_COMBOS) {
                    // Sort by lastPlayed date, remove oldest
                    const sorted = keys.sort((a, b) => {
                        const dateA = store[a].lastPlayed || '2000-01-01';
                        const dateB = store[b].lastPlayed || '2000-01-01';
                        return dateA.localeCompare(dateB);
                    });
                    const toRemove = sorted.slice(0, keys.length - HIGHSCORE_MAX_COMBOS);
                    toRemove.forEach(k => delete store[k]);
                }
                localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(store));
            } catch (e) {
                // localStorage not available
            }
        }
        
        function getHighscoreForSettings() {
            const store = getHighscoreStore();
            const key = getSettingsKey();
            return store[key] || null;
        }
        
        function saveAndCompareHighscore() {
            const store = getHighscoreStore();
            const key = getSettingsKey();
            const currentScore = solved;
            const currentMaxRating = Math.round(settings.currentRating);
            
            const existing = store[key] || null;
            const isNewHighscore = !existing || currentScore > existing.solved || 
                (currentScore === existing.solved && currentMaxRating > existing.maxRating);
            
            if (isNewHighscore) {
                store[key] = {
                    solved: currentScore,
                    maxRating: currentMaxRating,
                    errors: errors,
                    date: new Date().toISOString(),
                    lastPlayed: new Date().toISOString()
                };
            } else {
                // Update lastPlayed even if not a new highscore
                store[key].lastPlayed = new Date().toISOString();
            }
            
            saveHighscoreStore(store);
            
            return { existing, isNewHighscore };
        }
        
        function renderHighscoreComparison() {
            const section = document.getElementById('highscore-section');
            const container = document.getElementById('highscore-comparison');
            
            const { existing, isNewHighscore } = saveAndCompareHighscore();
            const currentScore = solved;
            const currentMaxRating = Math.round(settings.currentRating);
            
            section.style.display = 'block';
            
            let html = '';
            
            if (isNewHighscore) {
                if (!existing) {
                    // First time with these settings
                    html += '<div style="text-align:center; margin-top:8px;">';
                    html += '<div style="color:var(--accent-red-id); font-size:1rem; margin-bottom:4px;">' + t('firstHighScore') + '</div>';
                    html += '<div style="font-family:\'JetBrains Mono\',monospace; font-size:1.4rem; color:var(--accent-green);">';
                    html += currentScore + ' ' + t('solvedCount') + '</div>';
                    html += '<div style="font-size:0.85rem; color:var(--text-secondary);">~' + currentMaxRating + ' Rating</div>';
                    html += '</div>';
                } else {
                    // New record!
                    html += '<div style="text-align:center; margin-top:8px;">';
                    html += '<div style="color:var(--accent-red-id); font-size:1rem; margin-bottom:8px;">' + t('newHighScore') + '</div>';
                    html += '<div style="display:flex; justify-content:center; gap:30px; align-items:center;">';
                    html += '<div style="text-align:center;">';
                    html += '<div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">' + t('before') + '</div>';
                    html += '<div style="font-family:\'JetBrains Mono\',monospace; font-size:1.1rem; color:var(--text-secondary); text-decoration:line-through;">';
                    html += existing.solved + '</div>';
                    html += '</div>';
                    html += '<div style="color:var(--accent-red-id); font-size:1.2rem;">&#8594;</div>';
                    html += '<div style="text-align:center;">';
                    html += '<div style="font-size:0.75rem; color:var(--accent-red-id); text-transform:uppercase; letter-spacing:0.05em;">' + t('new_') + '</div>';
                    html += '<div style="font-family:\'JetBrains Mono\',monospace; font-size:1.4rem; color:var(--accent-green);">';
                    html += currentScore + '</div>';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                }
            } else {
                // Not a new record
                html += '<div style="text-align:center; margin-top:8px;">';
                html += '<div style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:8px;">' + t('highScoreForSettings') + '</div>';
                html += '<div style="display:flex; justify-content:center; gap:30px; align-items:center;">';
                html += '<div style="text-align:center;">';
                html += '<div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">' + t('now') + '</div>';
                html += '<div style="font-family:\'JetBrains Mono\',monospace; font-size:1.1rem; color:var(--text-primary);">';
                html += currentScore + '</div>';
                html += '</div>';
                html += '<div style="text-align:center;">';
                html += '<div style="font-size:0.75rem; color:var(--accent-red-id); text-transform:uppercase; letter-spacing:0.05em;">' + t('highScore') + '</div>';
                html += '<div style="font-family:\'JetBrains Mono\',monospace; font-size:1.4rem; color:var(--accent-green);">';
                html += existing.solved + '</div>';
                html += '</div>';
                html += '</div>';
                html += '</div>';
            }
            
            container.innerHTML = html;
        }

        // =====================================================
        // HELP SYSTEM (no cost, no penalty)
        // =====================================================
        let hintSquare = null; // Currently highlighted hint square
        
        function showThemeHint() {
            if (!gameActive || !currentPuzzle) return;
            
            currentPuzzleUsedThemeHint = true;
            
            const themes = currentPuzzle[4];
            const themeList = themes.split(' ');
            const germanNames = [];
            const addedConsolidated = new Set(); // Avoid duplicate consolidated themes
            
            // Themes to exclude from hints
            const excludeThemes = new Set([
                'opening', 'middlegame', 'endgame',           // Game phases
                'oneMove', 'short', 'long', 'veryLong'        // Length themes (we calculate ourselves)
            ]);
            
            // Check if any mateInX theme is present
            const mateInXThemes = new Set(['mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5']);
            const hasMateInX = themeList.some(t => mateInXThemes.has(t));
            
            // If mateInX present, also exclude generic "mate" (redundant)
            if (hasMateInX) {
                excludeThemes.add('mate');
            }
            
            for (const theme of themeList) {
                if (excludeThemes.has(theme)) continue;
                
                // Check if this is a sub-theme that maps to a consolidated mate theme
                const consolidatedKey = REVERSE_MATE_MAPPINGS[theme.toLowerCase()];
                if (consolidatedKey && !addedConsolidated.has(consolidatedKey)) {
                    for (const [category, catThemes] of Object.entries(getPuzzleThemes())) {
                        if (catThemes[consolidatedKey]) {
                            germanNames.push(catThemes[consolidatedKey]);
                            addedConsolidated.add(consolidatedKey);
                            break;
                        }
                    }
                    continue;
                }
                if (consolidatedKey && addedConsolidated.has(consolidatedKey)) continue;
                
                for (const [category, catThemes] of Object.entries(getPuzzleThemes())) {
                    if (category === t('catGamePhases')) continue;
                    if (catThemes[theme]) {
                        germanNames.push(catThemes[theme]);
                        break;
                    }
                }
            }
            
            // Add calculated move count only if no mateInX present (mateInX already implies move count)
            if (!hasMateInX) {
                const totalMoves = currentPuzzle[2].split(' ').length;
                const playerMoves = Math.ceil((totalMoves - 1) / 2);
                germanNames.push(playerMoves + ' ' + (playerMoves === 1 ? t('movesSingular') : t('movesPlural')));
            }
            
            if (germanNames.length === 0) {
                germanNames.push(t('noThemesAvailable'));
            }
            
            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'theme-overlay';
            
            let tagsHtml = germanNames.map(n => '<span class="theme-tag">' + n + '</span>').join('');
            
            overlay.innerHTML = '<div class="theme-overlay-content">' +
                '<h4>' + t('puzzleThemesTitle') + '</h4>' +
                '<div>' + tagsHtml + '</div></div>';
            
            overlay.addEventListener('click', () => overlay.remove());
            document.body.appendChild(overlay);
        }
        
        function showPieceHint() {
            if (!gameActive || !currentPuzzle || moveIndex >= puzzleMoves.length) return;
            
            currentPuzzleUsedPieceHint = true;
            
            const expectedUCI = puzzleMoves[moveIndex];
            const startSquare = expectedUCI.substring(0, 2);
            
            // Clear previous hint
            clearHint();
            
            // Highlight the start square
            hintSquare = startSquare;
            const squareEl = document.querySelector('#board .square[data-square="' + startSquare + '"]');
            if (squareEl) {
                squareEl.classList.add('hint-square');
            }
        }
        
        function clearHint() {
            hintSquare = null;
            document.querySelectorAll('.hint-square').forEach(el => el.classList.remove('hint-square'));
        }

        // =====================================================
        // PERFORMANCE RATING SYSTEM (experimental)
        // =====================================================
        // Each puzzle gets:
        // 1. An "effective rating" = puzzle rating + time bonus/penalty
        // 2. An "actual score" based on solve quality (hints, attempts)
        // The ELO algorithm finds the rating where expected = actual total score.
        
        // Time bonus: logarithmic interpolation between anchor points
        // 1s: +1000, 10s: +500, 60s: +100, 180s: 0, 300s: -50, 600s+: -100
        const TIME_BONUS_ANCHORS = [
            [1, 1000],
            [10, 500],
            [60, 100],
            [180, 0],
            [300, -50],
            [600, -100]
        ];
        
        function getTimeBonus(seconds) {
            if (seconds <= TIME_BONUS_ANCHORS[0][0]) return TIME_BONUS_ANCHORS[0][1];
            if (seconds >= TIME_BONUS_ANCHORS[TIME_BONUS_ANCHORS.length - 1][0]) {
                return TIME_BONUS_ANCHORS[TIME_BONUS_ANCHORS.length - 1][1];
            }
            
            // Find surrounding anchors and interpolate logarithmically
            for (let i = 0; i < TIME_BONUS_ANCHORS.length - 1; i++) {
                const [t0, b0] = TIME_BONUS_ANCHORS[i];
                const [t1, b1] = TIME_BONUS_ANCHORS[i + 1];
                if (seconds >= t0 && seconds <= t1) {
                    // Log interpolation on time axis, linear on bonus
                    const logT0 = Math.log(t0);
                    const logT1 = Math.log(t1);
                    const logT = Math.log(seconds);
                    const fraction = (logT - logT0) / (logT1 - logT0);
                    return b0 + fraction * (b1 - b0);
                }
            }
            return 0;
        }
        
        function getActualScore(result) {
            if (!result.solved) return 0;
            
            // Base score for solving
            let score = 1.0;
            
            // Hint penalties
            const usedTheme = result.usedThemeHint;
            const usedPiece = result.usedPieceHint;
            const hadWrongAttempts = result.attempts > 0;
            
            if (usedTheme && usedPiece) {
                score = 0.2;
            } else if (usedPiece) {
                score = 0.3;
            } else if (usedTheme) {
                score = 0.6;
            } else if (hadWrongAttempts) {
                score = 0.3;
            }
            
            // If both hints AND wrong attempts, reduce further
            if (hadWrongAttempts && (usedTheme || usedPiece)) {
                score = Math.max(score * 0.5, 0.1);
            }
            
            return score;
        }
        
        function getEffectiveRating(result) {
            // Puzzle rating + time bonus = effective difficulty beaten
            return result.puzzleRating + getTimeBonus(result.timeSpent);
        }
        
        function getExpectedScore(playerRating, effectiveRating) {
            const diff = effectiveRating - playerRating;
            return 1 / (1 + Math.pow(10, diff / 400));
        }
        
        function calculatePerformanceRating() {
            if (performanceResults.length === 0) return null;
            
            // Binary search: find rating where sum(expected) = sum(actual)
            let lo = 0, hi = 4000;
            
            const actualTotal = performanceResults.reduce((sum, r) => {
                return sum + getActualScore(r);
            }, 0);
            
            // Edge case: all failed
            if (actualTotal === 0) return 0;
            
            for (let iter = 0; iter < 50; iter++) {
                const mid = (lo + hi) / 2;
                const expectedTotal = performanceResults.reduce((sum, r) => {
                    return sum + getExpectedScore(mid, getEffectiveRating(r));
                }, 0);
                
                if (expectedTotal < actualTotal) {
                    lo = mid;
                } else {
                    hi = mid;
                }
            }
            
            return Math.round((lo + hi) / 2);
        }
        
        function recordPuzzlePerformance(puzzleRating, solved, timeSpent, attempts) {
            performanceResults.push({
                puzzleRating: puzzleRating,
                solved: solved,
                timeSpent: timeSpent,
                attempts: attempts,
                usedThemeHint: currentPuzzleUsedThemeHint,
                usedPieceHint: currentPuzzleUsedPieceHint
            });
        }

        // =====================================================
        // THEME FILTER UI
        // =====================================================
        // Rebuild theme filter checkboxes (called on init and language change)
        function buildThemeFilter() {
            const container = document.getElementById('theme-filter-container');
            // Remember checked state
            const checkedThemes = new Set();
            container.querySelectorAll('.theme-checkbox:checked').forEach(function(cb) {
                checkedThemes.add(cb.value);
            });
            container.innerHTML = '';
            for (const [category, themes] of Object.entries(getPuzzleThemes())) {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'theme-category-group';
                const categoryLabel = document.createElement('div');
                categoryLabel.className = 'theme-category-label';
                categoryLabel.textContent = category;
                categoryDiv.appendChild(categoryLabel);
                for (const [key, label] of Object.entries(themes)) {
                    const itemLabel = document.createElement('label');
                    itemLabel.className = 'theme-item';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = key;
                    checkbox.className = 'theme-checkbox';
                    if (checkedThemes.has(key)) checkbox.checked = true;
                    const span = document.createElement('span');
                    span.textContent = label;
                    itemLabel.appendChild(checkbox);
                    itemLabel.appendChild(span);
                    categoryDiv.appendChild(itemLabel);
                }
                container.appendChild(categoryDiv);
            }
            updateThemeFilterDisplay();
        }

        // Global reference for updateThemeFilterDisplay (used by applyLanguage)
        var updateThemeFilterDisplay;

        function populateThemeFilter() {
            const container = document.getElementById('theme-filter-container');
            const resetBtn = document.getElementById('theme-reset-btn');
            const toggle = document.getElementById('theme-filter-toggle');
            const panel = document.getElementById('theme-dropdown-panel');
            const display = document.getElementById('theme-filter-display');

            // Expose updateThemeDisplay before buildThemeFilter() calls it
            updateThemeFilterDisplay = updateThemeDisplay;

            // Build initial theme checkboxes
            buildThemeFilter();
            
            // Toggle panel open/close
            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                toggle.classList.toggle('open');
                panel.classList.toggle('open');
            });
            
            // Close when clicking outside
            document.addEventListener('click', function(e) {
                if (!toggle.contains(e.target) && !panel.contains(e.target)) {
                    toggle.classList.remove('open');
                    panel.classList.remove('open');
                }
            });
            
            // Prevent panel from closing when clicking inside
            panel.addEventListener('click', function(e) {
                e.stopPropagation();
            });
            
            // Reset button - removes all checkmarks
            resetBtn.addEventListener('click', function() {
                const allCheckboxes = document.querySelectorAll('.theme-checkbox');
                allCheckboxes.forEach(cb => cb.checked = false);
                updateThemeDisplay();
            });
            
            // Update display when individual checkboxes change
            container.addEventListener('change', function(e) {
                if (e.target.classList.contains('theme-checkbox')) {
                    updateThemeDisplay();
                }
            });
            
            function updateThemeDisplay() {
                const checkedBoxes = document.querySelectorAll('.theme-checkbox:checked');
                const count = checkedBoxes.length;
                const totalCount = document.querySelectorAll('.theme-checkbox').length;

                if (count === 0 || count === totalCount) {
                    display.textContent = t('allThemes');
                } else if (count === 1) {
                    const themeKey = checkedBoxes[0].value;
                    let themeName = '';
                    for (const [category, themes] of Object.entries(getPuzzleThemes())) {
                        if (themes[themeKey]) {
                            themeName = themes[themeKey];
                            break;
                        }
                    }
                    display.textContent = themeName;
                } else {
                    display.textContent = count + ' ' + t('allThemes').split(' ').pop();
                }
            }
            // (updateThemeFilterDisplay already assigned above, before buildThemeFilter)
        }

        // =====================================================
        // TOGGLE DROPDOWNS (Ton, Tipps)
        // =====================================================
        function initToggleDropdown(toggleId, panelId, displayId, updateFn) {
            const toggle = document.getElementById(toggleId);
            const panel = document.getElementById(panelId);
            if (!toggle || !panel) return;

            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                toggle.classList.toggle('open');
                panel.classList.toggle('open');
            });

            document.addEventListener('click', function(e) {
                if (!toggle.contains(e.target) && !panel.contains(e.target)) {
                    toggle.classList.remove('open');
                    panel.classList.remove('open');
                }
            });

            panel.addEventListener('click', function(e) {
                e.stopPropagation();
            });

            panel.addEventListener('change', updateFn);
        }

        function updateSoundDisplay() {
            const moves = document.getElementById('sound-moves-cb').checked;
            const effects = document.getElementById('sound-effects-cb').checked;
            const display = document.getElementById('sound-display');
            if (moves && effects) display.textContent = t('soundAllOn');
            else if (moves) display.textContent = t('soundMoves');
            else if (effects) display.textContent = t('soundEffects');
            else display.textContent = t('soundOff');
        }

        function updateTipsDisplay() {
            const temas = document.getElementById('tips-temas-cb').checked;
            const piece = document.getElementById('tips-piece-cb').checked;
            const display = document.getElementById('tips-display');
            if (temas && piece) display.textContent = t('hintsAll');
            else if (temas) display.textContent = t('hintsThemes');
            else if (piece) display.textContent = t('hintsPiece');
            else display.textContent = t('hintsNone');
        }

        // =====================================================
        // SETTINGS PERSISTENCE (localStorage)
        // =====================================================
        const SETTINGS_KEY = 'kustompuzzle_settings_v1';

        function saveSettings() {
            try {
                const data = {
                    timeLimit: document.getElementById('time-limit').value,
                    timeLimitCustom: parseInt(document.getElementById('time-custom-value').value) || 5,
                    startRating: document.getElementById('start-rating').value,
                    startRatingCustom: parseInt(document.getElementById('rating-custom-value').value) || 1400,
                    maxErrors: document.getElementById('max-errors').value,
                    maxErrorsCustom: parseInt(document.getElementById('errors-custom-value').value) || 3,
                    ratingIncrease: document.getElementById('rating-increase').value,
                    ratingIncreaseCustom: parseInt(document.getElementById('increase-custom-value').value) || 15,
                    soundMoves: document.getElementById('sound-moves-cb').checked,
                    soundEffects: document.getElementById('sound-effects-cb').checked,
                    themeFilter: Array.from(document.querySelectorAll('.theme-checkbox:checked')).map(cb => cb.value),
                    themeMatchAll: document.querySelector('input[name="theme-match"]:checked').value === 'all',
                    bonusTime: document.getElementById('bonus-time').value,
                    bonusTimeCustom: parseInt(document.getElementById('bonus-custom-value').value) || 0,
                    errorBehavior: document.getElementById('error-behavior').value,
                    tipstemas: document.getElementById('tips-temas-cb').checked,
                    tipsPiece: document.getElementById('tips-piece-cb').checked,
                    colorChoice: document.getElementById('color-choice').value,
                    showRating: document.getElementById('show-rating').value,
                    pieceCountMin: parseInt(document.getElementById('piece-count-min').value),
                    pieceCountMax: parseInt(document.getElementById('piece-count-max').value)
                };
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
            } catch (e) {
                // localStorage not available
            }
        }

        function loadSettings() {
            try {
                const raw = localStorage.getItem(SETTINGS_KEY);
                if (!raw) return;
                const data = JSON.parse(raw);

                // Main settings (selects with custom option)
                const selectFields = [
                    { id: 'time-limit', key: 'timeLimit', customId: 'time-custom-value', customKey: 'timeLimitCustom', customContainerId: 'time-custom' },
                    { id: 'start-rating', key: 'startRating', customId: 'rating-custom-value', customKey: 'startRatingCustom', customContainerId: 'rating-custom' },
                    { id: 'max-errors', key: 'maxErrors', customId: 'errors-custom-value', customKey: 'maxErrorsCustom', customContainerId: 'errors-custom' },
                    { id: 'rating-increase', key: 'ratingIncrease', customId: 'increase-custom-value', customKey: 'ratingIncreaseCustom', customContainerId: 'increase-custom' },
                    { id: 'bonus-time', key: 'bonusTime', customId: 'bonus-custom-value', customKey: 'bonusTimeCustom', customContainerId: 'bonus-custom' }
                ];

                selectFields.forEach(f => {
                    if (data[f.key] !== undefined) {
                        document.getElementById(f.id).value = data[f.key];
                        if (data[f.key] === 'custom') {
                            document.getElementById(f.customContainerId).style.display = 'block';
                            document.getElementById(f.customId).value = data[f.customKey] || '';
                        }
                    }
                });

                // Simple selects
                if (data.errorBehavior !== undefined) document.getElementById('error-behavior').value = data.errorBehavior;
                if (data.colorChoice !== undefined) document.getElementById('color-choice').value = data.colorChoice;
                if (data.showRating !== undefined) document.getElementById('show-rating').value = data.showRating;

                // Checkboxes
                if (data.soundMoves !== undefined) document.getElementById('sound-moves-cb').checked = data.soundMoves;
                if (data.soundEffects !== undefined) document.getElementById('sound-effects-cb').checked = data.soundEffects;
                if (data.tipstemas !== undefined) document.getElementById('tips-temas-cb').checked = data.tipstemas;
                if (data.tipsPiece !== undefined) document.getElementById('tips-piece-cb').checked = data.tipsPiece;

                // Theme filter checkboxes
                if (data.themeFilter && data.themeFilter.length > 0) {
                    document.querySelectorAll('.theme-checkbox').forEach(cb => {
                        cb.checked = data.themeFilter.includes(cb.value);
                    });
                }
                if (data.themeMatchAll !== undefined) {
                    const radio = document.querySelector('input[name="theme-match"][value="' + (data.themeMatchAll ? 'all' : 'any') + '"]');
                    if (radio) radio.checked = true;
                }

                // Range sliders
                if (data.pieceCountMin !== undefined) document.getElementById('piece-count-min').value = data.pieceCountMin;
                if (data.pieceCountMax !== undefined) document.getElementById('piece-count-max').value = data.pieceCountMax;

                // Update all display texts
                updateSoundDisplay();
                updateTipsDisplay();
                updateThemeDisplay();
                updatePieceCountDisplay();
            } catch (e) {
                // Corrupt data — ignore
            }
        }

        function resetSettings() {
            localStorage.removeItem(SETTINGS_KEY);

            // Reset main selects to defaults
            document.getElementById('time-limit').value = '300';
            document.getElementById('start-rating').value = '1400';
            document.getElementById('max-errors').value = '3';
            document.getElementById('rating-increase').value = '15';

            // Hide all custom inputs
            ['time-custom', 'rating-custom', 'errors-custom', 'increase-custom', 'bonus-custom'].forEach(id => {
                document.getElementById(id).style.display = 'none';
            });
            document.getElementById('time-custom-value').value = 5;
            document.getElementById('rating-custom-value').value = 1400;
            document.getElementById('errors-custom-value').value = 3;
            document.getElementById('increase-custom-value').value = 15;
            document.getElementById('bonus-custom-value').value = 0;

            // Reset extended settings
            document.getElementById('bonus-time').value = '0';
            document.getElementById('error-behavior').value = 'retry';
            document.getElementById('color-choice').value = 'mixed';
            document.getElementById('show-rating').value = '1';

            // Reset checkboxes
            document.getElementById('sound-moves-cb').checked = true;
            document.getElementById('sound-effects-cb').checked = true;
            document.getElementById('tips-temas-cb').checked = true;
            document.getElementById('tips-piece-cb').checked = true;

            // Reset theme filter
            document.querySelectorAll('.theme-checkbox').forEach(cb => cb.checked = false);
            const anyRadio = document.querySelector('input[name="theme-match"][value="any"]');
            if (anyRadio) anyRadio.checked = true;

            // Reset range sliders
            document.getElementById('piece-count-min').value = 3;
            document.getElementById('piece-count-max').value = 32;

            // Update displays
            updateSoundDisplay();
            updateTipsDisplay();
            updateThemeDisplay();
            updatePieceCountDisplay();

            // Collapse extended settings
            const content = document.getElementById('extended-content');
            const toggle = document.querySelector('.extended-toggle');
            if (content) content.classList.remove('open');
            if (toggle) toggle.classList.remove('open');

            // Visual feedback
            const btn = document.querySelector('.btn-secondary');
            if (btn) {
                const original = btn.textContent;
                btn.textContent = t('done');
                setTimeout(() => { btn.textContent = original; }, 1200);
            }
        }

        // Range slider interaction
        function updatePieceCountDisplay() {
            const min = parseInt(document.getElementById('piece-count-min').value);
            const max = parseInt(document.getElementById('piece-count-max').value);
            const display = document.getElementById('piece-count-display');
            if (min === 3 && max === 32) {
                display.textContent = t('hintsAll');
            } else {
                display.textContent = min + ' \u2013 ' + max;
            }
            // Update track highlight
            const track = document.getElementById('piece-count-track');
            const range = 32 - 3;
            const leftPct = ((min - 3) / range) * 100;
            const rightPct = ((max - 3) / range) * 100;
            track.style.left = leftPct + '%';
            track.style.width = (rightPct - leftPct) + '%';
        }

        function initPieceCountSlider() {
            const minSlider = document.getElementById('piece-count-min');
            const maxSlider = document.getElementById('piece-count-max');

            function enforceMinMax() {
                const minVal = parseInt(minSlider.value);
                const maxVal = parseInt(maxSlider.value);
                if (minVal > maxVal) {
                    minSlider.value = maxVal;
                }
                if (maxVal < minVal) {
                    maxSlider.value = minVal;
                }
                updatePieceCountDisplay();
            }

            minSlider.addEventListener('input', enforceMinMax);
            maxSlider.addEventListener('input', enforceMinMax);
            updatePieceCountDisplay();
        }

        // =====================================================
        // PP_32: ANALYSE-MODUS
        // =====================================================

        function switchReviewMode(mode) {
            reviewState.mode = mode;

            // Button-Highlighting
            document.querySelectorAll('.review-mode-btn').forEach(b => b.classList.remove('active'));
            const activeBtn = document.getElementById('mode-btn-' + mode);
            if (activeBtn) activeBtn.classList.add('active');

            const solutionEl   = document.getElementById('review-solution');
            const analysisEl   = document.getElementById('analysis-controls');
            const sfPanelEl    = document.getElementById('stockfish-panel');
            const evalBarEl    = document.getElementById('eval-bar');
            const boardSection = document.getElementById('review-detail-board-section');

            if (mode === 'loesung') {
                exitAnalysisMode();
                reviewState.solutionVisible = true;
                solutionEl && solutionEl.classList.remove('hidden');
                analysisEl && analysisEl.classList.add('hidden');
                sfPanelEl  && sfPanelEl.classList.add('hidden');
                evalBarEl  && evalBarEl.classList.add('hidden');
                boardSection && boardSection.classList.remove('with-eval');
                clearReviewFeedback();
            } else if (mode === 'solution') {
                exitAnalysisMode();
                reviewState.solutionVisible = false;
                solutionEl && solutionEl.classList.add('hidden');
                analysisEl && analysisEl.classList.add('hidden');
                sfPanelEl  && sfPanelEl.classList.add('hidden');
                evalBarEl  && evalBarEl.classList.add('hidden');
                boardSection && boardSection.classList.remove('with-eval');
                // "Nochmal"-Modus: passendes Standard-Feedback wiederherstellen
                if (reviewState.puzzleolved) {
                    setReviewFeedback(t('solvedMsg'), 'solved');
                } else {
                    setReviewFeedback(t('findBestMove'), 'neutral');
                }
            } else {
                enterAnalysisMode(mode === 'stockfish');
                solutionEl && solutionEl.classList.add('hidden');
                analysisEl && analysisEl.classList.remove('hidden');

                if (mode === 'stockfish') {
                    sfPanelEl  && sfPanelEl.classList.remove('hidden');
                    evalBarEl  && evalBarEl.classList.remove('hidden');
                    boardSection && boardSection.classList.add('with-eval');
                } else {
                    sfPanelEl  && sfPanelEl.classList.add('hidden');
                    evalBarEl  && evalBarEl.classList.add('hidden');
                    boardSection && boardSection.classList.remove('with-eval');
                }
                updateAnalysisGameOverFeedback();
            }
        }

        function reviewNeuerVersuch() {
            openReviewDetail(reviewState.currentIndex);
        }

        function enterAnalysisMode(withStockfish) {
            // Nur resetten wenn noch kein Analysespiel laeuft (Fix: Stellung beim Moduswechsel behalten)
            if (analysisState.game === null) {
                // Rebuild FEN history from puzzle start to current review position
                const puzzle = playedpuzzle[reviewState.currentIndex].puzzle;
                const startFen = puzzle[1];
                const tempGame = new Chess(startFen);
                const history = [tempGame.fen()];
                const moves = [];
                for (let i = 0; i < reviewState.moveIndex; i++) {
                    const uci = reviewState.moves[i];
                    const m = tempGame.move({
                        from: uci.substring(0, 2),
                        to: uci.substring(2, 4),
                        promotion: uci.length > 4 ? uci[4] : undefined
                    });
                    if (!m) break; // Invalid UCI move — stop rebuilding history
                    history.push(tempGame.fen());
                    moves.push(m);
                }
                analysisState.game = new Chess(reviewState.game.fen());
                analysisState.history = history;
                analysisState.moves = moves;
                analysisState.index = history.length - 1;
                analysisState.selectedSquare = null;
                renderAnalysisBoard();
                updateReviewTurnIndicator();
                updateAnalysisNavButtons();
            }

            if (withStockfish) {
                if (sfState.worker && sfState.ready) {
                    // Worker läuft bereits: direkt analysieren
                    sfAnalyzePosition(analysisState.game.fen());
                } else {
                    // Erster Aufruf: FEN in Queue, dann laden
                    sfState.pendingFen = analysisState.game.fen();
                    sfInit(); // async; readyok-Handler wertet sfState.pendingFen aus
                }
            }
        }

        function exitAnalysisMode() {
            sfStop();
            analysisState.game = null;
            analysisState.history = [];
            analysisState.moves = [];
            analysisState.index = -1;
            analysisState.selectedSquare = null;

            // Lösung-Board wiederherstellen
            renderReviewBoard();
            updateReviewTurnIndicator();
        }

        function renderAnalysisBoard() {
            if (!analysisState.game) return;
            renderBoardGeneric({
                boardId: 'review-board',
                chessGame: analysisState.game,
                isFlipped: reviewState.playerColor === 'b',
                selectedSquare: analysisState.selectedSquare,
                lastMoveFrom: null,
                lastMoveTo: null,
                canInteract: true,
                playerColor: analysisState.game.turn(),
                showValidMoves: true,
                hintSquare: null,
                onSquareClick: handleAnalysisSquareClick,
                onDragStart: analysisDrag.start
            });
        }

        function handleAnalysisSquareClick(square, event) {
            if (analysisDrag.isDragging()) {
                analysisDrag.resetDrag();
                return;
            }
            if (!analysisState.game) return;

            const piece = analysisState.game.get(square);

            if (analysisState.selectedSquare) {
                if (analysisState.selectedSquare === square) {
                    analysisState.selectedSquare = null;
                    renderAnalysisBoard();
                    return;
                }

                if (analysisMakeMove(analysisState.selectedSquare, square, null)) {
                    analysisState.selectedSquare = null;
                } else if (piece && piece.color === analysisState.game.turn()) {
                    analysisState.selectedSquare = square;
                    renderAnalysisBoard();
                } else {
                    analysisState.selectedSquare = null;
                    renderAnalysisBoard();
                }
                return;
            }

            if (piece && piece.color === analysisState.game.turn()) {
                analysisState.selectedSquare = square;
                renderAnalysisBoard();
            }
        }

        function analysisMakeMove(from, to, promo) {
            if (!analysisState.game) return false;

            // Bauernumwandlung erkennen und Dialog öffnen (analog zum Lösungsmodus)
            if (!promo) {
                const movingPiece = analysisState.game.get(from);
                if (movingPiece && movingPiece.type === 'p') {
                    const targetRank = to[1];
                    if ((movingPiece.color === 'w' && targetRank === '8') ||
                        (movingPiece.color === 'b' && targetRank === '1')) {
                        const legal = analysisState.game.moves({ square: from, verbose: true });
                        if (legal.some(m => m.to === to && m.flags.includes('p'))) {
                            showAnalysisPromotionDialog(from, to);
                            // Selektion bereits aufheben, der Dialog übernimmt
                            analysisState.selectedSquare = null;
                            renderAnalysisBoard();
                            return true;
                        }
                    }
                }
            }

            const moveObj = analysisState.game.move({ from, to, promotion: promo || undefined });
            if (!moveObj) return false;

            // Sound abspielen (wie im normalen Spielmodus)
            playMoveSound(moveObj.piece, from, to, moveObj.captured || null, {
                flags: moveObj.flags || '',
                promotion: moveObj.promotion,
                isCheck: !!(moveObj.san && (moveObj.san.includes('+') || moveObj.san.includes('#')))
            });

            // History aktualisieren (Vorwärts-History verwerfen)
            analysisState.history = analysisState.history.slice(0, analysisState.index + 1);
            analysisState.moves   = analysisState.moves.slice(0, analysisState.index);
            analysisState.history.push(analysisState.game.fen());
            analysisState.moves.push(moveObj);
            analysisState.index = analysisState.history.length - 1;

            // Selektion vor Render loeschen (Fix: Mobile touch kann sonst keinen zweiten Zug machen)
            analysisState.selectedSquare = null;
            renderAnalysisBoard();
            updateReviewTurnIndicator();
            updateAnalysisNavButtons();

            if (reviewState.mode === 'stockfish') {
                sfAnalyzePosition(analysisState.game.fen());
            }
            updateAnalysisGameOverFeedback();
            return true;
        }

        function showAnalysisPromotionDialog(from, to) {
            const piece = analysisState.game.get(from);
            if (!piece) return;

            pendingAnalysisPromotion = { from, to, color: piece.color };

            const dialog = document.getElementById('promotion-dialog');
            const colorPrefix = piece.color === 'w' ? 'w' : 'b';

            const options = dialog.querySelectorAll('.promotion-option');
            const pieces = ['Q', 'N', 'R', 'B'];
            const pieceData = ['q', 'n', 'r', 'b'];
            options.forEach((opt, i) => {
                opt.innerHTML = PIECE_SVG[colorPrefix + pieces[i]];
                opt.dataset.piece = pieceData[i];
            });

            const board = document.getElementById('review-board');
            const boardRect = board.getBoundingClientRect();
            const squareSize = boardRect.width / 8;

            options.forEach(opt => {
                opt.style.width = squareSize + 'px';
                opt.style.height = squareSize + 'px';
            });

            const isFlipped = reviewState.playerColor === 'b';
            const fileIndex = to.charCodeAt(0) - 97;
            const rankIndex = parseInt(to[1]) - 1;

            const col = isFlipped ? 7 - fileIndex : fileIndex;
            const row = isFlipped ? rankIndex : 7 - rankIndex;

            const squareLeft = boardRect.left + col * squareSize;
            const squareTop = boardRect.top + row * squareSize;

            dialog.style.left = (squareLeft - 2) + 'px';
            dialog.style.top = (squareTop - 2) + 'px';
            dialog.classList.add('active');
        }

        function handleAnalysisPromotionChoice(piece) {
            if (!pendingAnalysisPromotion) return;

            const { from, to } = pendingAnalysisPromotion;
            const dialog = document.getElementById('promotion-dialog');
            dialog.classList.remove('active');
            pendingAnalysisPromotion = null;

            analysisMakeMove(from, to, piece);
        }

        function playAnalysisNavSound(moveObj) {
            if (!moveObj) return;
            playMoveSound(moveObj.piece, moveObj.from, moveObj.to, moveObj.captured || null, {
                flags: moveObj.flags || '',
                promotion: moveObj.promotion,
                isCheck: !!(moveObj.san && (moveObj.san.includes('+') || moveObj.san.includes('#')))
            });
        }

        function analysisGoBack() {
            if (analysisState.index <= 0) return;
            const undoneMove = analysisState.moves[analysisState.index - 1];
            analysisState.index--;
            analysisState.game = new Chess(analysisState.history[analysisState.index]);
            analysisState.selectedSquare = null;
            playAnalysisNavSound(undoneMove);
            renderAnalysisBoard();
            updateReviewTurnIndicator();
            updateAnalysisNavButtons();
            if (reviewState.mode === 'stockfish') sfAnalyzePosition(analysisState.game.fen());
            updateAnalysisGameOverFeedback();
        }

        function analysisGoForward() {
            if (analysisState.index >= analysisState.history.length - 1) return;
            const nextMove = analysisState.moves[analysisState.index];
            analysisState.index++;
            analysisState.game = new Chess(analysisState.history[analysisState.index]);
            analysisState.selectedSquare = null;
            playAnalysisNavSound(nextMove);
            renderAnalysisBoard();
            updateReviewTurnIndicator();
            updateAnalysisNavButtons();
            if (reviewState.mode === 'stockfish') sfAnalyzePosition(analysisState.game.fen());
            updateAnalysisGameOverFeedback();
        }

        function analysisGoToStart() {
            if (analysisState.history.length === 0) return;
            analysisState.index = 0;
            analysisState.game = new Chess(analysisState.history[0]);
            analysisState.selectedSquare = null;
            renderAnalysisBoard();
            updateReviewTurnIndicator();
            updateAnalysisNavButtons();
            if (reviewState.mode === 'stockfish') sfAnalyzePosition(analysisState.game.fen());
            updateAnalysisGameOverFeedback();
        }

        function analysisGoToEnd() {
            if (analysisState.history.length === 0) return;
            analysisState.index = analysisState.history.length - 1;
            analysisState.game = new Chess(analysisState.history[analysisState.index]);
            analysisState.selectedSquare = null;
            renderAnalysisBoard();
            updateReviewTurnIndicator();
            updateAnalysisNavButtons();
            if (reviewState.mode === 'stockfish') sfAnalyzePosition(analysisState.game.fen());
            updateAnalysisGameOverFeedback();
        }

        function updateAnalysisNavButtons() {
            const btns = document.querySelectorAll('.analysis-playback button');
            if (btns.length < 4) return;
            btns[0].disabled = analysisState.index <= 0;
            btns[1].disabled = analysisState.index <= 0;
            btns[2].disabled = !analysisState.history.length || analysisState.index >= analysisState.history.length - 1;
            btns[3].disabled = !analysisState.history.length || analysisState.index >= analysisState.history.length - 1;
        }

        // =====================================================
        // PP_32: STOCKFISH ENGINE (Blob Worker)
        // =====================================================

        const SF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';

        async function sfInit() {
            if (sfState.worker) return; // Bereits initialisiert
            const sfStatusEl = document.getElementById('sf-status');
            if (sfStatusEl) sfStatusEl.textContent = t('loadingStockfish');

            try {
                const response = await fetch(SF_CDN);
                if (!response.ok) throw new Error('HTTP ' + response.status);
                const code = await response.text();
                const blob = new Blob([code], { type: 'application/javascript' });
                const url = URL.createObjectURL(blob);
                sfState.worker = new Worker(url);
                URL.revokeObjectURL(url);

                sfState.worker.onmessage = function(e) {
                    sfHandleMessage(e.data);
                };
                sfState.worker.onerror = function(err) {
                    console.error('Stockfish Worker Fehler:', err);
                    if (sfStatusEl) sfStatusEl.textContent = t('stockfishError');
                };

                sfState.worker.postMessage('uci');
                sfState.worker.postMessage('setoption name MultiPV value 3');
                sfState.worker.postMessage('setoption name Hash value 64');
                sfState.worker.postMessage('setoption name Threads value ' + (navigator.hardwareConcurrency || 2));
                sfState.worker.postMessage('isready');

            } catch (err) {
                console.error('Stockfish laden fehlgeschlagen:', err);
                if (sfStatusEl) sfStatusEl.textContent = t('stockfishUnavailable');
            }
        }

        function sfHandleMessage(line) {
            if (line === 'readyok') {
                sfState.ready = true;
                const sfStatusEl = document.getElementById('sf-status');
                if (sfStatusEl) sfStatusEl.textContent = t('analyzing');
                // Falls eine Analyse in der Warteschlange steht
                if (sfState.pendingFen) {
                    const fen = sfState.pendingFen;
                    sfState.pendingFen = null;
                    sfAnalyzePosition(fen);
                }
                return;
            }

            // bestmove signals that the previous search has fully stopped —
            // safe to start the queued analysis now (no more stale info lines)
            if (line.startsWith('bestmove')) {
                sfState.analyzing = false;
                if (sfState.pendingAnalysis) {
                    const { fen, gen } = sfState.pendingAnalysis;
                    sfState.pendingAnalysis = null;
                    if (sfState.generation === gen) {
                        sfState.activeGeneration = gen;
                        sfState.worker.postMessage('position fen ' + fen);
                        sfState.worker.postMessage('go depth 24');
                        sfState.analyzing = true;
                    }
                }
                return;
            }

            if (!line.startsWith('info')) return;

            // Ignore stale info lines from previous position
            if (sfState.generation !== sfState.activeGeneration) return;

            const pvMatch  = line.match(/multipv (\d+)/);
            const scMatch  = line.match(/score (cp|mate) (-?\d+)/);
            const mvsMatch = line.match(/ pv (.+)/);

            if (!pvMatch || !scMatch || !mvsMatch) return;

            const pvNum = parseInt(pvMatch[1]);
            const scType = scMatch[1];
            const scVal  = parseInt(scMatch[2]);
            const uciMoves = mvsMatch[1].trim().split(' ');

            // UCI-Score ist aus Sicht des am Zug Seienden.
            // Umrechnung: immer aus Spieler-Perspektive anzeigen (Fix: Vorzeichen aendert sich nicht mit jedem Zug)
            const sideToMove = analysisState.game ? analysisState.game.turn() : 'w';
            // Schritt 1: UCI -> Weiss-Perspektive
            const whiteVal = (sideToMove === 'b') ? -scVal : scVal;
            // Schritt 2: Weiss-Perspektive -> Spieler-Perspektive
            const playerVal = (reviewState.playerColor === 'b') ? -whiteVal : whiteVal;

            // Bewertungsstring aus Spieler-Perspektive
            let evalStr;
            if (scType === 'mate') {
                evalStr = (playerVal > 0 ? '+' : '') + 'M' + Math.abs(playerVal);
            } else {
                const cp = playerVal / 100;
                evalStr = (cp > 0 ? '+' : '') + cp.toFixed(1);
            }

            // In sfState.lines eintragen (Index 0-2 für PV 1-3)
            if (!sfState.lines) sfState.lines = [];
            sfState.lines[pvNum - 1] = {
                eval: evalStr,
                moves: uciMoves
            };

            // UI aktualisieren wenn PV 1 da ist
            if (pvNum === 1) {
                updateEvalBar(evalStr);
            }
            updateSFVariants();
        }

        function sfAnalyzePosition(fen) {
            if (!sfState.worker) return;
            if (!sfState.ready) {
                sfState.pendingFen = fen; // Warteschlange
                return;
            }
            // Generation counter: ignore stale info lines during transition
            sfState.generation++;
            const gen = sfState.generation;
            // Alte Varianten leeren (Eval-Bar behält letzten Wert bis neue Daten kommen)
            sfState.lines = [];
            updateSFVariants();

            // Partie-Ende lokal behandeln: Stockfish liefert in Matt-/Patt-Stellungen
            // keine sinnvollen Info-Zeilen und bleibt teilweise hängen (kein bestmove),
            // wodurch nachfolgende Analysen nicht mehr starten.
            const tmp = new Chess(fen);
            if (tmp.game_over()) {
                // Eventuell laufende Suche abbrechen und Zustand zurücksetzen
                if (sfState.analyzing) {
                    sfState.worker.postMessage('stop');
                }
                sfState.analyzing = false;
                sfState.pendingAnalysis = null;
                sfState.activeGeneration = gen;
                const sfStatusEl = document.getElementById('sf-status');
                if (sfStatusEl) {
                    if (tmp.in_checkmate()) {
                        const winner = tmp.turn() === 'w' ? 'b' : 'w';
                        const playerWins = winner === reviewState.playerColor;
                        const evalStr = (playerWins ? '+' : '-') + 'M0';
                        updateEvalBar(evalStr);
                        sfStatusEl.textContent = '#';
                    } else {
                        updateEvalBar('0.0');
                        sfStatusEl.textContent = '½–½';
                    }
                }
                return;
            }

            if (sfState.analyzing) {
                // Engine is searching — send stop and queue new analysis.
                // bestmove handler will start it once old search is fully done.
                sfState.pendingAnalysis = { fen: fen, gen: gen };
                sfState.worker.postMessage('stop');
            } else {
                // No active search — start directly (no stale lines possible)
                sfState.activeGeneration = gen;
                sfState.worker.postMessage('position fen ' + fen);
                sfState.worker.postMessage('go depth 24');
                sfState.analyzing = true;
                const sfStatusEl = document.getElementById('sf-status');
                if (sfStatusEl) sfStatusEl.textContent = t('analyzing');
            }
        }

        function sfStop() {
            if (sfState.worker && sfState.ready) {
                sfState.worker.postMessage('stop');
            }
            sfState.analyzing = false;
            sfState.pendingAnalysis = null;
        }

        function sfTerminate() {
            sfStop();
            if (sfState.worker) {
                sfState.worker.terminate();
                sfState.worker = null;
                sfState.ready = false;
            }
        }

        function evalToPercent(evalStr) {
            // evalStr ist bereits aus Spieler-Perspektive: + = gut fuer Spieler
            // Linear: 0.00 = Mitte, +1 = 1/8 nach oben, +4 = ganz oben
            if (evalStr.includes('M')) {
                return evalStr.startsWith('+') ? 100 : 0;
            } else {
                const cp = parseFloat(evalStr);
                return Math.max(0, Math.min(100, Math.round(50 + cp * 12.5)));
            }
        }

        function updateEvalBar(evalStr) {
            const fillEl = document.getElementById('eval-bar-fill');
            const textEl = document.getElementById('eval-bar-text');
            if (!fillEl || !textEl) return;

            const pct = evalToPercent(evalStr);
            fillEl.style.height = pct + '%';

            // Text: oben wenn Spieler im Vorteil (pct > 50), unten wenn im Nachteil
            textEl.textContent = evalStr;
            if (pct >= 50) {
                textEl.style.top = 'auto';
                textEl.style.bottom = '4px';
                textEl.style.color = '#333';
            } else {
                textEl.style.top = '4px';
                textEl.style.bottom = 'auto';
                textEl.style.color = '#ccc';
            }
        }

        function updateSFVariants() {
            const container = document.getElementById('sf-variants');
            const sfStatusEl = document.getElementById('sf-status');
            if (!container) return;

            if (!sfState.lines || sfState.lines.filter(Boolean).length === 0) {
                container.innerHTML = '';
                return;
            }

            const fen = analysisState.game ? analysisState.game.fen() : null;
            let html = '';

            sfState.lines.filter(Boolean).forEach((line, i) => {
                const evalStr = line.eval;
                const evalClass = evalStr.startsWith('+') ? 'positive' :
                                  evalStr.startsWith('-') ? 'negative' : 'neutral';
                const sans = fen ? uciToSan(fen, line.moves.slice(0, 10)) : line.moves.slice(0, 5);
                const movesStr = sans.join(' ');

                html += '<div class="stockfish-variant">';
                html += '<span class="sf-eval ' + evalClass + '">' + (i + 1) + '. ' + evalStr + '</span>';
                html += '<span class="sf-moves">' + movesStr + '</span>';
                html += '</div>';
            });

            container.innerHTML = html;
            if (sfStatusEl && sfState.lines.filter(Boolean).length > 0) {
                sfStatusEl.textContent = '';
            }
        }

        function uciToSan(fen, uciMoves) {
            const tmp = new Chess(fen);
            const sans = [];
            for (const uci of uciMoves) {
                const m = tmp.move({
                    from: uci.slice(0, 2),
                    to: uci.slice(2, 4),
                    promotion: uci[4] || undefined
                });
                if (!m) break;
                sans.push(convertNotation(m.san));
            }
            return sans;
        }

        // =====================================================
        // INITIALIZATION
        // =====================================================
        game = new Chess();
        populateThemeFilter();
        initToggleDropdown('sound-toggle', 'sound-panel', 'sound-display', updateSoundDisplay);
        initToggleDropdown('tips-toggle', 'tips-panel', 'tips-display', updateTipsDisplay);
        initPieceCountSlider();
        loadSettings();

        // Highscores are now shown only after game end
        
        // Setup touch handlers once DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupBoardTouchHandlers);
        } else {
            setupBoardTouchHandlers();
        }
