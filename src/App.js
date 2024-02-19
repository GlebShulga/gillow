import { useEffect, useState } from "react";
import { ethers } from "ethers";

// Components
import Navigation from "./components/Navigation";
import Search from "./components/Search";
import Property from "./components/Property";

// ABIs
import RealEstate from "./abis/RealEstate.json";
import Escrow from "./abis/Escrow.json";

// Config
import config from "./config.json";

const App = () => {
  const [provider, setProvider] = useState(null);
  const [escrow, setEscrow] = useState(null);
  const [account, setAccount] = useState(null);
  const [realEstateObjects, setRealEstateObjects] = useState([]);
  const [chosenRealEstateObject, setChosenRealEstateObject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadBlockchainData = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    setProvider(provider);

    const network = await provider.getNetwork();

    const realEstate = new ethers.Contract(
      config[network.chainId].realEstate.address,
      RealEstate,
      provider
    );
    const totalSupply = await realEstate.totalSupply();
    const realEstateObjects = await Promise.all(
      Array.from({ length: Number(totalSupply) }, async (_, i) => {
        const uri = await realEstate.tokenURI(i + 1);
        const response = await fetch(uri);
        return response.json();
      })
    );
    setRealEstateObjects(realEstateObjects);

    const escrow = new ethers.Contract(
      config[network.chainId].escrow.address,
      Escrow,
      provider
    );
    setEscrow(escrow);

    const accounts = await provider.listAccounts();

    if (accounts.length > 0) {
      setAccount(accounts[0].address);
    }

    window.ethereum.on("accountsChanged", async () => {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const account = ethers.getAddress(accounts[0]);
      setAccount(account);
    });
  };

  useEffect(() => {
    loadBlockchainData();
  }, []);

  const propertyHandleClick = (realEstateObject = null) => {
    setChosenRealEstateObject(realEstateObject);
    setIsModalOpen(() => !isModalOpen);
  };

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <Search />
      <div className="cards__section">
        <h3>Homes For You</h3>
        <hr />
        <div className="cards">
          {realEstateObjects.map((realEstateObject) => (
            <div
              className="card"
              key={realEstateObject.id}
              onClick={() => propertyHandleClick(realEstateObject)}
            >
              <div className="card__image">
                <img src={realEstateObject.image} alt="Property" />
              </div>
              <div className="card__info">
                <h4>{realEstateObject.attributes[0].value} ETH</h4>
                <p>
                  <strong>{realEstateObject.attributes[2].value}</strong>{" "}
                  Bedrooms |
                  <strong>{realEstateObject.attributes[3].value}</strong>{" "}
                  Bathrooms |
                  <strong>{realEstateObject.attributes[4].value}</strong> Sq.
                  ft.
                </p>
                <p>{realEstateObject.address}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {isModalOpen && (
        <Property
          realEstateObject={chosenRealEstateObject}
          account={account}
          escrow={escrow}
          provider={provider}
          propertyHandleClick={propertyHandleClick}
        />
      )}
    </div>
  );
};

export default App;
