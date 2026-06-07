// src/components/Hero.jsx
import React from "react";
import HeroImg from "../assets/hero-illustration.png"; // Make sure hero.png is in src/assets/

const Hero = () => {
  return (
    <div style={{ textAlign: "center", margin: "2rem 0" }}>
      <img 
        src={HeroImg} 
        alt="Hero Illustration" 
        style={{ inlineSize: "300px", maxInlineSize: "100%" }} 
      />
      <h1>Welcome to construct-hub</h1>
      <p>Your dashboard starts here!</p>
    </div>
  );
};

export default Hero;
