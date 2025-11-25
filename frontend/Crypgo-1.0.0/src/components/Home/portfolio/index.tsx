import Link from "next/link";
import Image from "next/image"; // Make sure Image is imported for this component
// import { motion } from "framer-motion"; // Removed framer-motion import
// import { portfolioData } from "@/app/api/data"; // Removed crypto-specific import
// import { getImagePrefix } from "@/utils/utils"; // Removed if not broadly used outside Hero/Platform

const Portfolio = () => {
  // Define new data for cybersecurity features directly within the component
  // Updated to contain exactly 4 items for a clean 2x2 grid layout


  return (
    <section className="md:pt-48 sm:pt-28 pt-12" id="portfolio" style={{paddingBottom:"10em", paddingTop:"10em", background: "transparent"}}>
      <div className="container mx-auto lg:max-w-screen-xl px-4 sm:px-6">
        {/* Adjusted grid to be full width and content to be centered */}
        <div className="grid lg:grid-cols-1 items-center justify-center text-center gap-20">
          {/* The image column has been completely removed */}

          <div className="col-span-12"> {/* This div now spans full width */}
            <p className="sm:text-28 text-18 text-muted mb-4">
              Our <span className="text-primary">Services</span>
            </p>
            <h2 className="text-white sm:text-40 text-30 mb-4 font-medium">
              Comprehensive Cyber Intelligence at Your Fingertips!
            </h2>
            {/* Changed to a grid layout for horizontal alignment of features */}
            
          </div>
        </div>
      </div>
    </section>
  );
};

export default Portfolio;