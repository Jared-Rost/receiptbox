# Receipt Box 📦🧾

> A mobile app that scans receipts and organizes them in a customizable folder system

A working prototype for iOS and Android that transforms physical receipts into organized digital records.

## 📋 Overview

Receipt Box is a cross-platform mobile application that uses your phone's camera to scan receipts, extract information using AI-powered text parsing, and store them in an organized folder system. Perfect for personal finance tracking, expense management, or just keeping your receipts organized digitally.

### Key Features

- 📸 **Camera Scanning** - Capture receipts using your device camera
- 🤖 **AI-Powered Parsing** - Extract text and structure data using generative AI
- 📁 **Folder Organization** - Create custom folders to organize receipts by category, date, or project
- 📱 **Cross-Platform** - Works on both Android and iOS devices
- 💾 **Local Storage** - Keep your receipt data stored securely on your device
- 🔍 **Smart Text Extraction** - Automatically identifies key information from receipts

## 🛠️ Tech Stack

### Application (96.7% TypeScript, 3.3% JavaScript)
- **React Native** with Expo
- **TypeScript** for type-safe development
- **Generative AI API** (tested with Gemini, compatible with others)
- Mobile-first architecture

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- Expo CLI
- Generative AI API key (Gemini recommended, but other providers work too)
- iOS device with Expo Go app (recommended for development)
- Or Android device/emulator

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Jared-Rost/receipt-box.git
   cd receipt-box
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure API Key**
   - Obtain a Generative AI API key (e.g., from Google AI Studio for Gemini)
   - Add your API key to the project configuration

4. **Start the App**
   ```bash
   npx expo start
   ```

5. **Run on Device**
   - Scan the QR code with Expo Go app on your iOS or Android device
   - Or press `i` for iOS simulator / `a` for Android emulator

### Testing

The development build has been tested using the Expo Go app on iPhone.

## 📱 How It Works

1. **Capture** - Open the app and take a photo of your receipt
2. **Process** - AI analyzes the image and extracts text and key information
3. **Organize** - Choose or create a folder to store the receipt
4. **Access** - Browse your organized receipts anytime in the folder system

## 🏗️ Project Structure

```
receipt-box/
├── mobile/           # React Native/Expo application
├── README.md         # This file
└── LICENSE          # Project license
```

## 🔑 API Configuration

This app requires a Generative AI API key to function:

- **Tested with:** Google Gemini API
- **Compatible with:** Other generative AI providers (OpenAI, Anthropic, etc.)
- **Setup:** Add your API key to the configuration file

## 💡 Use Cases

- **Personal Finance** - Track personal expenses and categorize spending
- **Business Expenses** - Organize receipts for tax deductions and reimbursements
- **Project Management** - Keep receipts organized by project or client
- **Travel** - Store travel receipts in dedicated folders
- **Warranty Tracking** - Keep purchase receipts for warranty claims

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
