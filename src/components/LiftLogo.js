import React from 'react';
import Svg, { Path, Text, G } from 'react-native-svg';

const LiftLogo = ({ width = 200, height = 280 }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 500 700">
      {/* Logo Symbol - Verde/Teal */}
      <G transform="translate(250, 180)">
        {/* Triangolo esterno superiore */}
        <Path
          d="M -80,-120 
             Q -100,-140 -60,-150
             L 60,-150
             Q 100,-140 80,-120
             L 80,0
             Q 85,20 65,25
             L 25,25
             L 25,60
             Q 20,80 0,80
             Q -20,80 -25,60
             L -25,25
             L -65,25
             Q -85,20 -80,0
             Z"
          fill="#3DBAA0"
          stroke="#3DBAA0"
          strokeWidth="2"
        />
        
        {/* Triangolo interno */}
        <Path
          d="M -40,-80
             L 40,-80
             Q 50,-75 45,-60
             L 15,-10
             Q 8,0 0,0
             Q -8,0 -15,-10
             L -45,-60
             Q -50,-75 -40,-80
             Z"
          fill="transparent"
          stroke="#3DBAA0"
          strokeWidth="12"
        />
        
        {/* Dettaglio interno inferiore */}
        <Path
          d="M -15,5
             Q -10,15 0,15
             Q 10,15 15,5
             L 15,35
             Q 12,45 0,45
             Q -12,45 -15,35
             Z"
          fill="#3DBAA0"
        />
      </G>
      
      {/* Testo LIFT */}
      <G transform="translate(250, 420)">
        {/* L */}
        <Path
          d="M -160,-20 L -160,60 L -100,60 L -100,40 L -140,40 L -140,-20 Z"
          fill="white"
        />
        
        {/* I */}
        <Path
          d="M -70,-20 L -70,60 L -50,60 L -50,-20 Z"
          fill="white"
        />
        
        {/* F */}
        <Path
          d="M -20,-20 L -20,60 L 0,60 L 0,25 L 35,25 L 35,10 L 0,10 L 0,-5 L 40,-5 L 40,-20 Z"
          fill="white"
        />
        
        {/* T */}
        <Path
          d="M 70,-20 L 70,-5 L 90,-5 L 90,60 L 110,60 L 110,-5 L 130,-5 L 130,-20 Z"
          fill="white"
        />
      </G>
    </Svg>
  );
};

export default LiftLogo;