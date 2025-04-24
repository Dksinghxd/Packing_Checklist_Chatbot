// --- DOM Element References ---
const messageInput = document.querySelector("#prompt");
const submitButton = document.querySelector("#submit");
const chatArea = document.querySelector("#chatContainer");
const imageInput = document.querySelector("#image-input");
const imageButton = document.querySelector("#image-button");
const imagePreviewOverlay = document.querySelector("#image-preview-overlay");
const tripTypeSelect = document.querySelector("#tripTypeSelect");
const themeToggle = document.getElementById("themeToggle");

// --- API Configuration ---
const API_KEY = "AIzaSyBD9ylwWKgMqZpCL9enl2e48a3WLeObcZM";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// Weather API Configuration
const WEATHER_API_KEY = '51b251a06d0a4a55b1a163612252404'; // Replace with your API key
const WEATHER_API_URL = 'https://api.weatherapi.com/v1/current.json';

// Weather Icons Mapping
const weatherIcons = {
    '01d': 'fas fa-sun',
    '01n': 'fas fa-moon',
    '02d': 'fas fa-cloud-sun',
    '02n': 'fas fa-cloud-moon',
    '03d': 'fas fa-cloud',
    '03n': 'fas fa-cloud',
    '04d': 'fas fa-cloud',
    '04n': 'fas fa-cloud',
    '09d': 'fas fa-cloud-rain',
    '09n': 'fas fa-cloud-rain',
    '10d': 'fas fa-cloud-sun-rain',
    '10n': 'fas fa-cloud-moon-rain',
    '11d': 'fas fa-bolt',
    '11n': 'fas fa-bolt',
    '13d': 'fas fa-snowflake',
    '13n': 'fas fa-snowflake',
    '50d': 'fas fa-smog',
    '50n': 'fas fa-smog'
};

// --- State Object ---
let userInteraction = {
    message: null,
    file: { mime_type: null, data: null, name: null }
};

// --- Conversation Context ---
let conversationContext = [];

// --- Packing-related keywords and phrases for validation ---
const packingKeywords = [
    // Trip types
    'pack', 'list', 'bring', 'take', 'need', 'bag', 'suitcase', 'luggage',
    'travel', 'trip', 'vacation', 'holiday', 'destination', 'items', 'essentials',
    
    // Activities
    'beach', 'hiking', 'camping', 'business', 'winter', 'summer', 'backpack',
    'skiing', 'swimming', 'snorkeling', 'diving', 'trekking', 'conference',
    
    // Items
    'clothes', 'gear', 'equipment', 'checklist', 'packing list', 'carry',
    'outfit', 'wear', 'dress', 'shoes', 'toiletries', 'electronics',
    
    // Duration
    'days', 'weeks', 'month', 'weekend', 'night', 'stay'
];

const nonPackingPhrases = [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
    'how are you', 'what can you do', 'who are you', 'what is your name',
    'help me', 'can you help', 'tell me about', 'explain', 'what is',
    'weather', 'temperature', 'forecast', 'restaurant', 'food', 'eat',
    'hotel', 'booking', 'reservation', 'ticket', 'flight', 'train',
    'direction', 'map', 'where is', 'how to get', 'distance'
];

/** Checks if query is packing-related */
function isPackingRelated(query) {
    if (!query) return false;
    
    query = query.toLowerCase();
    
    // Check for non-packing phrases first
    if (nonPackingPhrases.some(phrase => query.includes(phrase))) {
        // If it's a greeting or general question but also includes packing keywords,
        // we'll still consider it packing-related
        return packingKeywords.some(keyword => query.includes(keyword));
    }
    
    // Check for packing-related keywords
    return packingKeywords.some(keyword => query.includes(keyword));
}

/** Generates appropriate response for non-packing queries */
function getNonPackingResponse(query) {
    query = query.toLowerCase();
    
    // Handle greetings
    if (['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'].some(greeting => query.includes(greeting))) {
        return `👋 Hello! I'm your AI Packing Assistant, specialized in creating packing lists for trips. I can help you:

• Create detailed packing lists for any destination
• Suggest items based on your activities
• Provide weather-appropriate recommendations
• Organize items by category

Please tell me about your trip (destination, duration, activities), and I'll help you pack everything you need! 🎒`;
    }
    
    // Handle "what can you do" type questions
    if (query.includes('what can you do') || query.includes('who are you') || query.includes('what is your name')) {
        return `I'm a specialized AI Packing List Generator, focused exclusively on helping you pack for trips. My capabilities include:

• Creating customized packing lists
• Suggesting items based on destination and activities
• Providing weather-appropriate recommendations
• Organizing items by category

I don't handle general travel questions, bookings, or other topics. To get started, simply tell me about your trip, and I'll help you create the perfect packing list! 🧳`;
    }
    
    // Default response for other non-packing queries
    return `I apologize, but I'm specialized in creating packing lists for trips. I can't help with general travel questions, bookings, or other topics.

To get my help, please ask about what to pack for your trip. For example:
• "What should I pack for a week in Hawaii?"
• "Create a packing list for a business trip"
• "What do I need for a camping weekend?"

How can I help you pack for your next adventure? 🎒`;
}

/** Adjusts textarea height dynamically */
function autoGrowTextarea() {
    messageInput.style.height = 'auto';
    const computedStyle = getComputedStyle(messageInput);
    const maxHeight = parseInt(computedStyle.maxHeight, 10) || 112;
    const scrollHeight = messageInput.scrollHeight;
    const padding = parseInt(computedStyle.paddingTop) + parseInt(computedStyle.paddingBottom);
    const newHeight = Math.min(scrollHeight, maxHeight);
    messageInput.style.height = newHeight + 'px';
    messageInput.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
}

/** Scrolls chat area to the bottom */
function scrollToBottom() {
    setTimeout(() => {
        chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: "smooth" });
    }, 50);
}

/**
 * Creates an HTML element for a chat message
 */
function createMessageElement(bubbleContent, type) {
    const messageContainer = document.createElement("div");
    const avatarIcon = type === 'user' ? 
        '<i class="fas fa-user text-travel-primary"></i>' : 
        '<i class="fas fa-suitcase text-travel-primary"></i>';
    
    const bubbleClasses = type === 'user'
        ? 'bg-travel-primary text-white rounded-br-lg ml-auto'
        : 'bg-gray-100 border border-subtle-border text-text-dark rounded-bl-lg mr-auto';
    const alignmentClass = type === 'user' ? 'ml-auto' : 'mr-auto';
    const avatarOrderClass = type === 'user' ? 'order-last' : '';

    messageContainer.className = `message-container flex items-end gap-2 max-w-[85%] ${alignmentClass}`;

    messageContainer.innerHTML = `
        <div class="w-10 h-10 rounded-full flex-shrink-0 border-2 border-gray-200 shadow-sm ${avatarOrderClass} bg-white flex items-center justify-center">
            ${avatarIcon}
        </div>
        <div class="p-3 px-4 rounded-xl shadow-sm ${bubbleClasses}">
            <div class="text-base leading-relaxed message-content">${bubbleContent}</div>
        </div>
    `;

    requestAnimationFrame(() => {
        setTimeout(() => { messageContainer.classList.add('animate-in'); }, 10);
    });
    return messageContainer;
}

/** Clears the image preview state and UI */
function clearImagePreview() {
    userInteraction.file = { mime_type: null, data: null, name: null };
    imagePreviewOverlay.src = "";
    imagePreviewOverlay.classList.remove('active');
    imageInput.value = "";
    imageButton.title = "Upload Image";
}

/** Calls the Gemini API to get a response */
async function generateResponse(thinkingBubble) {
    const aiChatBubbleContainer = thinkingBubble.querySelector(".message-content");
    const tripType = tripTypeSelect.value;

    // Check if query is packing-related
    if (!isPackingRelated(userInteraction.message) && !userInteraction.file.name) {
        aiChatBubbleContainer.innerHTML = getNonPackingResponse(userInteraction.message);
        thinkingBubble.classList.add('animate-in');
        return;
    }

    let instruction = `You are a specialized Packing List Generator Assistant. Your ONLY role is to:
    1. Create detailed, organized packing lists for travel
    2. Provide specific quantities for items
    3. Categorize items (Clothing, Toiletries, Electronics, etc.)
    4. Consider weather conditions and activities
    5. Include essential travel documents
    6. Suggest special items based on the trip type

    IMPORTANT: Only respond to queries about packing lists and travel items. For any other topics, politely explain that you can only help with creating packing lists for trips.
    
    Current trip type: ${tripType}. If an image is shared, analyze it ONLY to suggest appropriate items for that destination.
    
    Format your response with clear categories and bullet points.`;

    if (conversationContext.length > 0) {
        instruction += " Previous conversation context:\n";
        conversationContext.forEach((entry) => {
            instruction += `${entry.role}: ${entry.content}\n`;
        });
    }

    if (userInteraction.message) {
        instruction += ` Current query: "${userInteraction.message}"`;
    }
    if (userInteraction.file.name) {
        instruction += ` Analyze the uploaded image: ${userInteraction.file.name}`;
    }

    const requestParts = [{ text: instruction }];
    if (userInteraction.file.data && userInteraction.file.mime_type) {
        requestParts.push({
            inline_data: { mime_type: userInteraction.file.mime_type, base64_data: userInteraction.file.data }
        });
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: requestParts }] })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.error?.message || `API Error: ${response.status}`);
        }

        let apiResponseText = "Creating your packing list... 🎒";

        if (data.candidates?.[0]?.content?.parts?.length > 0) {
            apiResponseText = data.candidates[0].content.parts
                .map(part => part.text || '')
                .join(' ')
                .trim()
                .replace(/</g, "<")
                .replace(/>/g, ">")
                .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 rounded text-sm">$1</code>')
                .replace(/\n/g, '<br>');
        }

        aiChatBubbleContainer.innerHTML = apiResponseText;
        conversationContext.push({ role: 'assistant', content: apiResponseText });

        if (conversationContext.length > 6) {
            conversationContext.splice(0, conversationContext.length - 6);
        }

    } catch (error) {
        console.error("Error:", error);
        aiChatBubbleContainer.innerHTML = `<span class="text-red-500">Oops! Something went wrong: ${error.message}</span>`;
    } finally {
        thinkingBubble.classList.add('animate-in');
        scrollToBottom();
    }
}

/** Handles sending user message and initiating AI response */
function handleSendMessage() {
    let userMessage = messageInput.value.trim();
    const hasImage = userInteraction.file.data;

    if (!userMessage && !hasImage) return;

    userMessage = userMessage.replace(/\s+/g, ' ');
    userInteraction.message = userMessage;

    let userBubbleContent = '';
    if (userMessage) {
        userBubbleContent += userMessage.replace(/</g, "<").replace(/>/g, ">").replace(/\n/g, '<br>');
    }
    if (hasImage) {
        const imageName = userInteraction.file.name.replace(/</g, "<").replace(/>/g, ">");
        userBubbleContent += `${userMessage ? '<br>' : ''}<span class="text-xs italic block mt-1 opacity-70">(Image: ${imageName})</span>`;
    }

    const userMessageElement = createMessageElement(userBubbleContent, 'user');
    chatArea.appendChild(userMessageElement);

    const stagedFile = { ...userInteraction.file };
    messageInput.value = "";
    clearImagePreview();
    autoGrowTextarea();
    scrollToBottom();

    const thinkingBubbleHTML = `<div class="flex items-center space-x-1.5 py-1">
        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
        <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
    </div>`;
    const thinkingElement = createMessageElement(thinkingBubbleHTML, 'ai');
    chatArea.appendChild(thinkingElement);
    scrollToBottom();

    userInteraction.file = stagedFile;
    generateResponse(thinkingElement).finally(() => {
        userInteraction.file = { mime_type: null, data: null, name: null };
    });
}

/** Handles image file selection */
function handleImageSelection() {
    const file = imageInput.files[0];
    if (!file) { clearImagePreview(); return; }

    if (!file.type.startsWith("image/")) {
        alert("Please select an image file!");
        clearImagePreview();
        return;
    }

    const maxSizeMB = 4;
    if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`Image too large! Max ${maxSizeMB} MB.`);
        clearImagePreview();
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        userInteraction.file = {
            mime_type: file.type,
            data: e.target.result.split(",")[1],
            name: file.name
        };
        imagePreviewOverlay.src = e.target.result;
        imagePreviewOverlay.classList.add('active');
        imageButton.title = `Image: ${file.name} (Click to clear)`;
    };
    reader.onerror = (error) => {
        console.error("File error:", error);
        alert("Error reading image file.");
        clearImagePreview();
    };
    reader.readAsDataURL(file);
}

// --- Event Listeners ---
messageInput.addEventListener('input', autoGrowTextarea);
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});
submitButton.addEventListener("click", handleSendMessage);
imageButton.addEventListener("click", (e) => {
    if (userInteraction.file.data) {
        e.preventDefault();
        clearImagePreview();
    } else {
        imageInput.click();
    }
});
imageInput.addEventListener("change", handleImageSelection);

// Theme Management
const html = document.documentElement;

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);

// Theme toggle functionality
themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// --- Initial Setup ---
autoGrowTextarea();
scrollToBottom();

// Initial greeting
if (chatArea.children.length === 0) {
    const initialGreetingHTML = `👋 Welcome! I'm your AI Packing List Generator, here to ensure you never forget essential items for your trips.

To get started, simply:
• Tell me your destination
• Mention trip duration
• Describe planned activities

For example: "I'm going to Hawaii for a week, planning beach days and hiking."

How can I help you pack for your next adventure? 🎒`;
    const initialElement = createMessageElement(initialGreetingHTML, 'ai');
    initialElement.classList.add('animate-in');
    chatArea.appendChild(initialElement);
}

// Dynamic form handling
const promptTextarea = document.getElementById('prompt');

tripTypeSelect.addEventListener('change', () => {
    const selectedType = tripTypeSelect.value;
    updatePlaceholder(selectedType);
});

function updatePlaceholder(tripType) {
    const placeholders = {
        beach: "Describe your beach vacation (destination, duration, activities like swimming, snorkeling...)",
        hiking: "Tell us about your hiking trip (location, trail difficulty, duration, camping plans...)",
        business: "Share details about your business trip (destination, duration, meetings, formal events...)",
        city: "Describe your city break (destination, duration, planned activities, sightseeing...)",
        winter: "Tell us about your winter sports trip (location, duration, activities like skiing, snowboarding...)",
        backpacking: "Share details about your backpacking adventure (route, duration, climate, activities...)"
    };
    
    promptTextarea.placeholder = placeholders[tripType] || "Describe your trip (destination, duration, activities)...";
}

// Initialize with default placeholder
updatePlaceholder(tripTypeSelect.value);

// Enhanced chat message styling
function appendMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`;
    
    const messageContent = document.createElement('div');
    messageContent.className = `max-w-[80%] p-4 rounded-lg ${
        isUser 
            ? 'bg-travel-primary text-white' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'
    }`;
    
    messageContent.innerHTML = content;
    messageDiv.appendChild(messageContent);
    chatArea.appendChild(messageDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    // If it's a user message, try to extract city and fetch weather
    if (isUser) {
        const city = extractCityFromMessage(content);
        if (city) {
            fetchWeather(city).then(weatherData => {
                updateWeatherDisplay(weatherData);
            });
        }
    }
}

// Enhanced image preview
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// Function to fetch weather data
async function fetchWeather(city) {
    try {
        const response = await fetch(`${WEATHER_API_URL}?q=${city}&appid=${WEATHER_API_KEY}&units=metric`);
        if (!response.ok) {
            throw new Error('Weather data not found');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching weather:', error);
        return null;
    }
}

// Function to update weather display
function updateWeatherDisplay(weatherData) {
    const weatherInfo = document.getElementById('weatherInfo');
    if (!weatherData) {
        weatherInfo.innerHTML = `
            <div class="text-center">
                <i class="fas fa-exclamation-circle text-red-500 text-2xl mb-2"></i>
                <p class="text-gray-600 dark:text-gray-300">Weather information not available</p>
            </div>
        `;
        return;
    }

    const iconClass = weatherIcons[weatherData.weather[0].icon] || 'fas fa-cloud';
    const temp = Math.round(weatherData.main.temp);
    const feelsLike = Math.round(weatherData.main.feels_like);
    const humidity = weatherData.main.humidity;
    const windSpeed = Math.round(weatherData.wind.speed * 3.6); // Convert m/s to km/h

    weatherInfo.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div class="flex flex-col items-center">
                <i class="${iconClass} text-4xl text-travel-primary mb-2"></i>
                <h3 class="text-xl font-semibold text-gray-800 dark:text-white">${weatherData.name}</h3>
                <p class="text-gray-600 dark:text-gray-300">${weatherData.weather[0].description}</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="text-center">
                    <p class="text-3xl font-bold text-gray-800 dark:text-white">${temp}°C</p>
                    <p class="text-sm text-gray-600 dark:text-gray-300">Temperature</p>
                </div>
                <div class="text-center">
                    <p class="text-3xl font-bold text-gray-800 dark:text-white">${feelsLike}°C</p>
                    <p class="text-sm text-gray-600 dark:text-gray-300">Feels Like</p>
                </div>
                <div class="text-center">
                    <p class="text-3xl font-bold text-gray-800 dark:text-white">${humidity}%</p>
                    <p class="text-sm text-gray-600 dark:text-gray-300">Humidity</p>
                </div>
                <div class="text-center">
                    <p class="text-3xl font-bold text-gray-800 dark:text-white">${windSpeed} km/h</p>
                    <p class="text-sm text-gray-600 dark:text-gray-300">Wind Speed</p>
                </div>
            </div>
        </div>
    `;
}

// Function to extract city from user message
function extractCityFromMessage(message) {
    // Simple city extraction - you might want to improve this
    const cityMatch = message.match(/\b(in|at|to|from)\s+([A-Za-z\s]+)(?:\s+for|\s+on|\s+from|\s+to|$)/i);
    if (cityMatch && cityMatch[2]) {
        return cityMatch[2].trim();
    }
    return null;
}
