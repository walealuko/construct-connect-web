import React, { useEffect, useState } from "react";

const LgaDropdownDynamic = () => {
  const [lgasData, setLgasData] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedLga, setSelectedLga] = useState("");

  useEffect(() => {
    const fetchLgas = async () => {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/xosasx/nigerian-local-government-areas/master/lgas.json"
        );
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        setLgasData(data);
      } catch (error) {
        console.error("Failed to fetch LGAs:", error);
      }
    };

    fetchLgas();
  }, []);

  const states = [...new Set(lgasData.map(item => item.state))];
  const filteredLgas = lgasData.filter(lga => lga.state === selectedState);

  return (
    <div style={{ margin: "20px" }}>
      <h2>Select a State and LGA</h2>

      <select
        value={selectedState}
        onChange={e => {
          setSelectedState(e.target.value);
          setSelectedLga("");
        }}
      >
        <option value="">-- Select State --</option>
        {states.map(state => (
          <option key={state} value={state}>
            {state}
          </option>
        ))}
      </select>

      <select
        value={selectedLga}
        onChange={e => setSelectedLga(e.target.value)}
        disabled={!selectedState}
        style={{ marginLeft: "10px" }}
      >
        <option value="">-- Select LGA --</option>
        {filteredLgas.map(lga => (
          <option key={lga.lga} value={lga.lga}>
            {lga.lga}
          </option>
        ))}
      </select>

      {selectedState && selectedLga && (
        <p>
          You selected: {selectedState} → {selectedLga}
        </p>
      )}
    </div>
  );
};

export default LgaDropdownDynamic;
