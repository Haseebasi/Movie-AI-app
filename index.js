import { openai, supabase } from './config.js';
import movies from './content.js';

const main = document.getElementById("main")
const questionForm = document.getElementById("qn")
const movieDetails = document.getElementById("movie-details")
const movieTitle = document.getElementById("movie-title")
const movieDescription = document.getElementById("movie-desc")
const chatMessages = [{
    role: 'system',
    content: `You are an expert AI Movie Concierge. Your sole task is to explain exactly WHY a specific movie suggestion perfectly matches a user's preferences based on their answers to three profiling questions.

CRITICAL INSTRUCTIONS:
1. You will be provided with a JSON string labeled 'suggestion' containing the movie details, and a 'Questions' section containing the user's answers.
2. Analyze the movie's 'content' string (which includes runtime, plot, genre, director, actors, and rating) and map it directly to what the user said they like.
3. Explicitly connect the dots for the user. For example:
   - If they want "something serious" and the movie is a "Biography, Drama, History", highlight that alignment.
   - If they want "something new" and the movie was released in 2022/2023, point out that it's a recent release.
   - If they mention a favorite movie, sub-genre, or vibe, find a parallel in the suggestion (e.g., similar directors, actors, high IMDB rating, or themes).

RESPONSE FORMAT:
- Speak directly to the user in a warm, enthusiastic, and conversational tone.
- Do not mention the raw data structure or phrases like "Based on the JSON provided". Keep the magic alive.
- Structure your response in 2-3 short, highly readable paragraphs or bullet points focusing entirely on the "why".
reply nothing if you dont know anything` 
}];


const inputArray = movies.map(movie => JSON.stringify(movie));
const data = await Promise.all(
    inputArray.map( async (textChunk) => {
        const embeddingResponse = createEmbedding(textChunk)
        return { 
          content: textChunk, 
          embedding: embeddingResponse 
        }
    })
  );
  await supabase.from('movies').insert(data);






async function createEmbedding(input){
    const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input,
  })
  return response.data[0].embedding
}



async function getAiMessage(text, query) {
  chatMessages.push({
    role: 'user',
    content: `suggestion: ${text} Questions: ${query}`
  });
  
  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: chatMessages,
    temperature: 0.65,
    frequency_penalty: 0.5
  });
  return choices[0].message.content;
}
async function searchRender(embedding) {
    const { data } = await supabase.rpc('match_movies', {
    query_embedding: embedding,
    match_threshold: 0.50,
    match_count: 1
    });
    let suggestion = data[0].content
    if (suggestion){
        const aiReply = getAiMessage(suggestion,query)
        suggestion = JSON.parse(suggestion)
        movieDetails.innerHTML = `<h2>${suggestion.title}(${suggestion.releaseYear})</h2>
        <p>${aiReply}</p>`

    }
}



document.addEventListener('submit',function(e){
    e.preventDefault()
    // console.log(document.getElementById('q1').value)
    // console.log(document.getElementById('q2').value)
    // console.log(document.getElementById('q3').value)
    const query = document.getElementById('q1').value + " " + document.getElementById('q2').value + " " + document.getElementById('q3').value
    const embedding = createEmbedding(query)
    searchRender(embedding)
    

    questionForm.classList.toggle("hide")
    movieDetails.classList.remove("hide")
    
})
document.addEventListener('click',function(e){
    
    if(e.target.id === "main-btn"){
        questionForm.classList.toggle("hide")
        document.getElementById("movie-details").classList.add("hide")
        questionForm.reset()
    }
})