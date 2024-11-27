// backend/src/controllers/aiController.js

const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const { SearchClient } = require("@azure/search-documents");
// Note: Removed splitResponseIntoChunks as we're returning the response directly
// const { splitResponseIntoChunks } = require('../utils/tokenUtils');

// Whitelist of college-related topics and greetings
const ALLOWED_TOPICS = [
  'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
  'admission', 'application', 'SEC', 'courses', 'programs', 'departments', 'faculty',
  'campus', 'facilities', 'hostel', 'hostels', 'dormitory', 'accommodation',
  'placement', 'placements', 'recruitment', 'companies', 'internships',
  'fees', 'tuition', 'scholarship', 'scholarships', 'financial aid',
  'tuition fees', 'academic', 'academics', 'curriculum', 'syllabus',
  'calendar', 'timetable', 'schedule', 'exam', 'exams', 'examination',
  'results', 'grades', 'gpa', 'attendance', 'student', 'students', 'alumni',
  'events', 'festivals', 'seminars', 'workshops', 'conferences', 'clubs',
  'associations', 'activities', 'library', 'libraries', 'laboratory', 'labs',
  'research', 'projects', 'transport', 'transportation', 'bus', 'bus schedule',
  'parking', 'canteen', 'cafeteria', 'food', 'mess', 'sports', 'athletics',
  'gym', 'health services', 'medical', 'counseling', 'career services',
  'student portal', 'online classes', 'e-learning', 'staff', 'professor',
  'professors', 'lecturer', 'lecturers', 'administration', 'contact information',
  'admission process', 'eligibility', 'cutoffs', 'rankings', 'achievements',
  'news', 'announcements', 'notices', 'faq', 'saveetha', 'college', 'sec',
  'engineering', 'courses offered', 'how to apply', 'campus life',
  'orientation', 'registration', 'enrollment', 'diploma', 'degree',
  'graduation', 'certificates', 'transcripts', 'departments', 'hostel fees',
  'hostel facilities', 'student services', 'student activities', 'academic calendar',
  'academic policies', 'student handbook', 'financial services', 'international students',
  'visa', 'cultural events', 'student council', 'learning resources', 'laboratories',
  'virtual tour', 'faq', 'contact us', 'support', 'helpdesk', 'training programs',
  'skill development', 'placement statistics', 'industry collaborations',
  'alumni network', 'scholarship programs', 'merit scholarships', 'need-based scholarships'
];

const GREETINGS = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];

// Validate if question is college-related
const isCollegeRelated = (question) => {
  const lowercaseQuery = question.toLowerCase();
  return ALLOWED_TOPICS.some(topic => lowercaseQuery.includes(topic));
};

const isGreeting = (question) => {
  const lowercaseQuery = question.toLowerCase();
  return GREETINGS.some(greeting => lowercaseQuery.includes(greeting));
};

const getResponse = async (req, res) => {
  const { question } = req.body;

  try {
    // Check for greetings first
    if (isGreeting(question)) {
      return res.json({
        answer: "Hello! How may I assist you with regards to Saveetha Engineering College?"
      });
    }

    // Initial topic validation for non-greetings
    if (!isCollegeRelated(question)) {
      return res.json({
        answer: "I'm here to assist with information about Saveetha Engineering College only. Please ask questions related to our institution."
      });
    }

    const endpoint = process.env["AZURE_OPENAI_ENDPOINT"];
    const azureApiKey = process.env["AZURE_OPENAI_API_KEY"];
    const deploymentId = process.env["AZURE_OPENAI_DEPLOYMENT_ID"];
    const searchEndpoint = process.env["AZURE_AI_SEARCH_ENDPOINT"];
    const searchKey = process.env["AZURE_AI_SEARCH_API_KEY"];
    const searchIndex = process.env["AZURE_AI_SEARCH_INDEX"];

    if (!endpoint || !azureApiKey || !deploymentId || !searchEndpoint || !searchKey || !searchIndex) {
      console.error("Missing required environment variables");
      return res.status(500).json({ error: "Configuration error" });
    }

    const client = new OpenAIClient(endpoint, new AzureKeyCredential(azureApiKey));
    const searchClient = new SearchClient(
      searchEndpoint,
      searchIndex,
      new AzureKeyCredential(searchKey)
    );

    // Perform search with available fields
    const searchResults = await searchClient.search(question, {
      select: ["content"],
      queryType: "simple",
      top: 20
    });

    let searchContext = "";
const MAX_CONTEXT_LENGTH = 3000;

for await (const result of searchResults.results) {
  if (result.document && result.document.content) {
    if ((searchContext + result.document.content).length > MAX_CONTEXT_LENGTH) {
      break;
    }
    searchContext += result.document.content + "\n";
  }
}

    // Enhanced system prompt
    const systemContent = `You are an AI assistant representing Saveetha Engineering College (SEC).
Use the following context to answer questions: ${searchContext}

STRICT RESPONSE GUIDELINES:
- ONLY answer questions about Saveetha Engineering College
- IMMEDIATELY redirect unrelated questions
- DO NOT provide information about other institutions
- DO NOT engage in general conversation
- Be friendly and professional
- Use "We" when referring to the college

RESPONSE FORMATTING:
1. Use '##' for main headings
2. Use '###' for subheadings
3. Use bullet points (-) for lists
4. Use **bold** for important information
5. Use proper spacing between sections

RESPONSE STRUCTURE:
## [Main Topic]
### Overview
- Key points
- Important information

### Details
- Specific information
- Process steps

### Contact Information
- Email: admission@saveetha.ac.in
- Phone: **+91 8939902737**

### For More Information
- Additional resources
- Next steps`;

    const messages = [
      {
        role: "system",
        content: systemContent
      },
      { role: "user", content: question }
    ];

    // Get chat completion
    const result = await client.getChatCompletions(deploymentId, messages, {
      temperature: 0.5,
      maxTokens: 500,
      topP: 0.9,
      frequencyPenalty: 0,
      presencePenalty: 0
    });

    const response = result.choices[0].message.content;
    // Return the response directly as a string
    res.json({ answer: response });

  } catch (error) {
    console.error("Error details:", error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('Request data:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    res.status(500).json({ 
      error: "Error processing request",
      details: error.message 
    });
  }
};

module.exports = { getResponse };