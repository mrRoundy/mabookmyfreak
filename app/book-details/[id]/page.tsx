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

  return (
    <div className="bg-[#FCF9F6] py-8 min-h-screen">
      <div className="container max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 items-start">

        {/* --- STICKY IMAGE WRAPPER (Direct Grid Child) --- */}
        {/*
          CHANGE 1: Added 'md:flex' and 'md:justify-center'
          This makes the column a flex container and centers its child.
        */}
        <div className="md:col-span-1 sticky top-28 h-fit md:flex md:justify-start md:-ml-[1.2rem]">
          <Image
            src={bookData.image || "/image/placeholder.png"}
            alt={`Cover of ${bookData.title}`}
            width={350}
            height={525}
            className="h-auto rounded-lg shadow-2xl object-cover" 
            priority
            quality={100}
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>

        {/* --- CONTENT SECTION (Direct Grid Child) --- */}
        <div className="md:col-span-2 min-h-screen relative
                        md:before:content-[''] md:before:absolute md:before:inset-y-0
                        md:before:w-[0.5rem] md:before:bg-[#D4C0A1]
                        md:before:left-[-1rem] lg:before:left-[-1.5rem]
                        md:before:translate-x-[-50%]">

          {/* Container for book content using custom styles */}
          <div className="book-content-box">
            {/* Title, Author, Genre */}
            <section aria-labelledby="book-title-author-genre" className="book-hero-info mb-8 text-center md:text-left">
              <h1 id="book-title-author-genre" className="text-4xl md:text-5xl font-bold font-serif mb-2 text-classic-green">
                {bookData.title}
              </h1>
              <h2 className="text-xl md:text-2xl italic text-gray-600 mb-6">
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
              <p className="text-lg leading-relaxed text-gray-700">
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
                      <p className="highlight-text">{highlight}</p>
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