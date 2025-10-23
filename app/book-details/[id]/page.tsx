// app/book-details/[id]/page.tsx

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Image from "next/image";
import { notFound } from "next/navigation";

// Interface for the book data fetched from Supabase
interface Book {
  id: number;
  title: string;
  author: string;
  image?: string;
  "sub-genre"?: string;
  synopsis?: string;
  highlights?: string; // Raw highlights string from DB
}

// Fetches book details from the 'filtered_books' table
async function fetchBookDetails(id: string): Promise<Book | null> {
  const supabase = createServerComponentClient({ cookies });
  const { data, error } = await supabase
    .from("filtered_books")
    .select('id, title, author, image, "sub-genre", synopsis, highlights')
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching book details:", error);
    return null; // Return null on error
  }
  return data;
}

// Parses the highlights string into an array of strings
const parseHighlights = (
  highlightsText: string | undefined | null,
): string[] => {
  if (!highlightsText) return [];
  // Regex to find text within double quotes or curly quotes
  const regex = /(["“])(.*?)(["”])/g;
  const matches = Array.from(highlightsText.matchAll(regex));
  // Return matched quotes or the whole text if no quotes found
  return matches.length > 0
    ? matches.map((match) => match[2].trim())
    : [highlightsText.trim()];
};

// The main page component
export default async function BookDetailsPage({
  params,
}: {
  params: { id: string }; // Expecting the book ID from the route parameters
}) {
  // Fetch book data
  const bookData = await fetchBookDetails(params.id);

  // If book not found, show the 404 page
  if (!bookData) {
    notFound();
  }

  // Parse the highlights
  const parsedHighlights = parseHighlights(bookData.highlights);
  // Set the genre (hardcoded)
  const primaryGenre = "Self-improvement";

  // --- STYLE VARIABLES ---
  const imageContainerClasses = "w-full max-w-2xs lg:col-span-1 lg:max-w-none lg:mx-0 sticky top-28 h-fit lg:flex lg:justify-start";
  const imageClasses = "w-full h-auto rounded-lg shadow-2xl object-cover";

  const titleClasses = "text-xl md:text-2xl lg:text-5xl font-bold font-serif mb-2 text-classic-green";
  const authorClasses = "text-sm md:text-base lg:text-2xl italic text-gray-600 mb-6";
  const synopsisClasses = "text-sm lg:text-base leading-relaxed text-gray-700";
  const highlightClasses = "highlight-text text-sm lg:text-base";
  // --- END STYLE VARIABLES ---


  return (
    <div className="bg-[#FCF9F6] py-8 min-h-screen">
      <div className="container max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">

        {/* --- STICKY IMAGE WRAPPER --- */}
        <div className={imageContainerClasses}>
          <Image
            src={bookData.image || "/image/placeholder.png"}
            alt={`Cover of ${bookData.title}`}
            width={350}
            height={525}
            className={imageClasses} 
            priority
            quality={100}
            sizes="(max-width: 1024px) 100vw, 33vw"
          />
        </div>

        {/* --- CONTENT SECTION --- */}
        {/*
          CHANGE IS HERE: I have removed 'min-h-screen' from this div.
          Its height will now be based on its content, fixing your gap issue.
        */}
        <div className="lg:col-span-2 relative
                        lg:before:content-[''] lg:before:absolute lg:before:inset-y-0
                        lg:before:w-[0.5rem] lg:before:bg-[#D4C0A1]
                        lg:before:left-[-1rem] lg:before:left-[-1.5rem]
                        lg:before:translate-x-[-50%]">

          {/* Container for book content using custom styles */}
          <div className="book-content-box">
            {/* Title, Author, Genre */}
            <section aria-labelledby="book-title-author-genre" className="book-hero-info mb-8 text-center lg:text-left">
              <h1 id="book-title-author-genre" className={titleClasses}>
                {bookData.title}
              </h1>
              <h2 className={authorClasses}>
                by {bookData.author || "Unknown Author"}
              </h2>
              {primaryGenre && (
                <p className="genre-display-text">
                  <span className="font-semibold">Genre:</span> {primaryGenre}
                </p>
              )}
            </section>

            {/* Synopsis */}
            <section aria-labelledby="synopsis-heading" className="mb-12">
              <h3 id="synopsis-heading" className="content-section-title">Synopsis</h3>
              <p className={synopsisClasses}>
                {bookData.synopsis || "Synopsis not available."}
              </p>
            </section>

            {/* Highlights */}
            {parsedHighlights.length > 0 && (
              <section aria-labelledby="highlights-heading">
                <h3 id="highlights-heading" className="content-section-title">Key Highlights</h3>
                <div className="space-y-8">
                  {parsedHighlights.map((highlight, index) => (
                    <div key={index} className="highlight-card">
                      <span className="highlight-quote-icon">“</span>
                      <p className={highlightClasses}>{highlight}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}