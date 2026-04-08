// src/components/Hero.jsx
import React from "react";
import HeroImg from "../assets/hero-illustration.png"; // Make sure hero.png is in src/assets/

const Hero = () => {
  return (
    <div style={{ textAlign: "center", margin: "2rem 0" }}>
      <img 
        src={HeroImg} 
        alt="Hero Illustration" 
        style={{ width: "300px", maxWidth: "100%" }} 
      />
      <h1>Welcome to Construct Connect</h1>
      <p>Your dashboard starts here!</p>
    </div>
  );
};

export default Hero;
