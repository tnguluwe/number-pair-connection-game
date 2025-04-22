// Game configuration
const config = {
    numberRadius: 20,
    padding: 30,
    minPairDistance: 150,
    colors: ['#FF5733', '#33FF57', '#3357FF', '#F3FF33', '#FF33F3', '#33FFF3']
};

// Game state
let numbers = [];
let pairs = [];
let connections = [];
let currentPath = null;
let gameComplete = false;

// DOM elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const newGameBtn = document.getElementById('newGame');
const messageEl = document.getElementById('message');

// Initialize game
function initGame() {
    numbers = [];
    pairs = [];
    connections = [];
    currentPath = null;
    gameComplete = false;
    messageEl.textContent = '';
    
    // Create number pairs (3-5 pairs for this example)
    const pairCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 1; i <= pairCount; i++) {
        pairs.push(i, i);
    }
    
    // Shuffle the pairs
    pairs = shuffleArray(pairs);
    
    // Position numbers randomly on canvas with constraints
    const placedPairs = {};
    
    for (let i = 0; i < pairs.length; i++) {
        const value = pairs[i];
        let x, y, validPosition;
        const maxAttempts = 200;
        let attempts = 0;
        
        do {
            validPosition = true;
            x = config.padding + Math.random() * (canvas.width - 2 * config.padding);
            y = config.padding + Math.random() * (canvas.height - 2 * config.padding);
            
            // Check for overlap with existing numbers
            for (const num of numbers) {
                const distance = Math.sqrt(Math.pow(num.x - x, 2) + Math.pow(num.y - y, 2));
                if (distance < config.numberRadius * 2.5) {
                    validPosition = false;
                    break;
                }
            }
            
            // Check distance from pair if already placed
            if (validPosition && placedPairs[value]) {
                const pairDistance = Math.sqrt(
                    Math.pow(placedPairs[value].x - x, 2) + 
                    Math.pow(placedPairs[value].y - y, 2)
                );
                if (pairDistance < config.minPairDistance) {
                    validPosition = false;
                }
            }
            
            attempts++;
            if (attempts >= maxAttempts) break;
        } while (!validPosition);
        
        if (validPosition) {
            const numObj = {
                value: value,
                x: x,
                y: y,
                connected: false,
                color: config.colors[value - 1] || '#000000'
            };
            numbers.push(numObj);
            
            // Track where we placed this pair
            if (!placedPairs[value]) {
                placedPairs[value] = numObj;
            }
        } else {
            // If we couldn't place this number, start over
            initGame();
            return;
        }
    }
    
    drawGame();
}

// Shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Draw the game state
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw connections
    for (const connection of connections) {
        if (connection.smoothedPoints) {
            drawSmoothedLine(connection.smoothedPoints, connection.color);
        } else {
            drawFreeformLine(connection.points, connection.color);
        }
    }
    
    // Draw current path (if any)
    if (currentPath) {
        drawFreeformLine(currentPath.points, currentPath.color);
    }
    
    // Draw numbers
    for (const num of numbers) {
        ctx.beginPath();
        ctx.arc(num.x, num.y, config.numberRadius, 0, Math.PI * 2);
        ctx.fillStyle = num.connected ? '#CCCCCC' : num.color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num.value, num.x, num.y);
    }
}

// Draw a freeform line
function drawFreeformLine(points, color) {
    if (points.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
}

// Draw a smoothed line using the points
function drawSmoothedLine(points, color) {
    if (points.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    // Use quadratic curves for smoothing
    for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    
    // Connect to the last point
    if (points.length > 1) {
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
}

// Smooth a set of points
function smoothPath(points) {
    if (points.length <= 2) return points;
    
    const smoothed = [];
    smoothed.push(points[0]);
    
    // Simple averaging for smoothing
    for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[i + 1];
        
        smoothed.push({
            x: (prev.x + curr.x + next.x) / 3,
            y: (prev.y + curr.y + next.y) / 3
        });
    }
    
    smoothed.push(points[points.length - 1]);
    return smoothed;
}

// Check if two line segments intersect
function linesIntersect(a1, a2, b1, b2) {
    // Calculate vectors
    const v1 = { x: a2.x - a1.x, y: a2.y - a1.y };
    const v2 = { x: b2.x - b1.x, y: b2.y - b1.y };
    
    // Calculate cross products
    const cross = v1.x * v2.y - v1.y * v2.x;
    
    // If lines are parallel, they don't intersect
    if (Math.abs(cross) < 0.000001) return false;
    
    // Calculate intersection point
    const t1 = ((b1.x - a1.x) * v2.y - (b1.y - a1.y) * v2.x) / cross;
    const t2 = ((b1.x - a1.x) * v1.y - (b1.y - a1.y) * v1.x) / cross;
    
    // Check if intersection is within both segments
    return t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1;
}

// Check if a new path would intersect any existing connections
function wouldIntersect(newPath) {
    const pathPoints = newPath.points;
    
    // Check each segment of the new path against all existing connections
    for (let i = 0; i < pathPoints.length - 1; i++) {
        const segStart = pathPoints[i];
        const segEnd = pathPoints[i + 1];
        
        for (const connection of connections) {
            const connPoints = connection.smoothedPoints || connection.points;
            
            for (let j = 0; j < connPoints.length - 1; j++) {
                if (linesIntersect(
                    segStart, segEnd,
                    connPoints[j], connPoints[j + 1]
                )) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Find number at position
function findNumberAt(x, y) {
    for (let i = 0; i < numbers.length; i++) {
        const num = numbers[i];
        const distance = Math.sqrt(Math.pow(num.x - x, 2) + Math.pow(num.y - y, 2));
        if (distance <= config.numberRadius && !num.connected) {
            return num;
        }
    }
    return null;
}

// Check if game is complete
function checkGameComplete() {
    if (numbers.every(num => num.connected)) {
        gameComplete = true;
        messageEl.textContent = 'Congratulations! You completed the puzzle!';
    }
}

// Event listeners
canvas.addEventListener('mousedown', (e) => {
    if (gameComplete) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const num = findNumberAt(x, y);
    if (num) {
        currentPath = {
            points: [{ x: num.x, y: num.y }],
            color: num.color,
            startNum: num
        };
        drawGame();
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (gameComplete || !currentPath) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Add point to current path
    currentPath.points.push({ x, y });
    drawGame();
});

canvas.addEventListener('mouseup', (e) => {
    if (gameComplete || !currentPath) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Add final point
    currentPath.points.push({ x, y });
    
    const endNum = findNumberAt(x, y);
    if (endNum && endNum !== currentPath.startNum && endNum.value === currentPath.startNum.value) {
        // Smooth the path after connection is made
        const smoothedPoints = smoothPath(currentPath.points);
        
        const newConnection = {
            from: currentPath.startNum,
            to: endNum,
            points: currentPath.points,
            smoothedPoints: smoothedPoints,
            color: currentPath.startNum.color
        };
        
        if (!wouldIntersect(newConnection)) {
            connections.push(newConnection);
            currentPath.startNum.connected = true;
            endNum.connected = true;
            checkGameComplete();
        } else {
            messageEl.textContent = 'Lines cannot intersect! Try again.';
            setTimeout(() => { messageEl.textContent = ''; }, 2000);
        }
    }
    
    currentPath = null;
    drawGame();
});

newGameBtn.addEventListener('click', initGame);

// Start the game
initGame();