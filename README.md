[![Demo](demo.png)](demo.png)

# Runway API Hair Makeover NextJS Example

This application demonstrates how to integrate with the Runway API to generate hair makeovers based on a user-uploaded selfie and a selected hairstyle.

- Upload a selfie.
- Get hairstyle recommendations based on face shape.
- Select a hairstyle.
- Click "Generate".

## Features

- Face shape detection and analysis
- Personalized hairstyle recommendations
- AI-powered hair makeover generation

## Getting Started

### Prerequisites

- Node.js
- npm
- Runway API key (you can get one at [https://dev.runwayml.com/](https://dev.runwayml.com/))

### Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

### API Key Configuration

This application requires a Runway API key to function. You need to set up an environment variable:

1. Create a `.env.local` file in the root of the project
2. Add your Runway API key as `RUNWAY_API_KEY`:

```
RUNWAY_API_KEY=your_runway_api_key_here
```

The API key will be automatically used by the application to authenticate requests to the Runway API.

### Running the application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How It Works

1. **Upload Selfie**: Upload a clear front-facing photo.
2. **Face Shape Analysis**: The app analyzes your face shape using AI.
3. **Get Recommendations**: Receive personalized hairstyle recommendations based on your face shape.
4. **Select Hairstyle**: Choose a hairstyle (recommended ones are highlighted).
5. **Generate Makeover**: The app uses Runway's API to create your hair makeover.

## Learn More

- [Runway API Documentation](https://docs.dev.runwayml.com/)
- [Next.js Documentation](https://nextjs.org/docs)
