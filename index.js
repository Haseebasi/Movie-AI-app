import { openai, supabase } from './config.js';
import movies from './content.js';




// ==================================
// Global variables
// ==================================
const main = document.getElementById("main")
const questionForm = document.getElementById("qn")
const movieDetails = document.getElementById("movie-details")
const movieTitle = document.getElementById("movie-title")
const movieDescription = document.getElementById("movie-desc")

//messages array for chat API
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



//inputting of movies array items to supabase vector database

const inputArray = movies.map(movie => JSON.stringify(movie));
const data = await Promise.all(
    inputArray.map( async (textChunk) => {
        const embeddingResponse =await createEmbedding(textChunk)
        return { 
          content: textChunk, 
          embedding: embeddingResponse 
        }
    })
  );
  await supabase.from('movies').insert(data);





//function to create embedding
async function createEmbedding(input){
    const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input,
  })
  return response.data[0].embedding
}


//function to create ai message according to the suggestion and query
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


// function to search for the suggestion and rendering the ai reply to the html
async function searchRender(query,embedding) {
    const { data } = await supabase.rpc('match_movies', {
    query_embedding: embedding,
    match_threshold: 0.50,
    match_count: 1
    });
    
    if (data && data.length > 0){
        let suggestion = data[0].content
        const aiReply =await getAiMessage(suggestion,query)
        suggestion = JSON.parse(suggestion)
        movieDetails.innerHTML = `<h2>${suggestion.title}(${suggestion.releaseYear})</h2>
        <p>${aiReply}</p>
        <button id="main-btn">Go Again</button>`

    }else {
        movieDetails.innerHTML = `<p>No matching movies found. Try adjusting your preferences!</p>
        <button id="main-btn">Go Again</button>`;
    }
}




//form submit event listener

document.addEventListener('submit',async function(e){
    e.preventDefault()
    // console.log(document.getElementById('q1').value)
    // console.log(document.getElementById('q2').value)
    // console.log(document.getElementById('q3').value)
    const query = document.getElementById('q1').value + " " +
        document.getElementById('q2').value + " " +
        document.getElementById('q3').value
    questionForm.classList.add("hide")
    movieDetails.classList.remove("hide")
    try{
    const embedding =await createEmbedding(query)
    await searchRender(query,embedding)
    }catch (err) {
        console.error("Error fetching recommendation:", err);
        movieDetails.innerHTML = `<p>Something went wrong. Please try again.</p>
        <button id="main-btn">Go Again</button>`;
    }
    

    
    
})



//try again button listener
document.addEventListener('click',function(e){
    
    if(e.target.id === "main-btn"){
        questionForm.classList.remove("hide")
        document.getElementById("movie-details").classList.add("hide")
        questionForm.reset()
    }
})