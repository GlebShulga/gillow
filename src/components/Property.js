import { useEffect, useState } from "react";
import close from "../assets/close.svg";

const Property = ({
  realEstateObject,
  account,
  provider,
  escrow,
  propertyHandleClick,
}) => {
  const [hasBought, setHasBought] = useState(false);
  const [hasLanded, setHasLanded] = useState(false);
  const [hasInspected, setHasInspected] = useState(false);
  const [hasSold, setHasSold] = useState(false);

  const [buyer, setBuyer] = useState(null);
  const [lender, setLender] = useState(null);
  const [inspector, setInspector] = useState(null);
  const [seller, setSeller] = useState(null);
  const [owner, setOwner] = useState(null);

  const [actionError, setActionError] = useState("");

  const fetchDetails = async () => {
    const buyer = await escrow.buyer(realEstateObject.id);
    setBuyer(buyer);

    const hasBought = await escrow.approval(realEstateObject.id, buyer);
    setHasBought(hasBought);

    const lender = await escrow.lender();
    setLender(lender);

    const hasLanded = await escrow.approval(realEstateObject.id, lender);
    setHasLanded(hasLanded);

    const seller = await escrow.seller();
    setSeller(seller);

    const hasSold = await escrow.approval(realEstateObject.id, seller);
    setHasSold(hasSold);

    const inspector = await escrow.inspector();
    setInspector(inspector);
  };

  const fetchOwner = async () => {
    if (await escrow.isListed(realEstateObject.id)) return;

    const owner = await escrow.buyer(realEstateObject.id);
    setOwner(owner);
  };

  const buyHandler = async () => {
    try {
      setActionError("");
      const escrowAmount = await escrow.escrowAmount(realEstateObject.id);
      const signer = await provider.getSigner();

      let transaction = await escrow
        .connect(signer)
        .depositEarnest(realEstateObject.id, { value: escrowAmount });
      await transaction.wait();

      transaction = await escrow
        .connect(signer)
        .approveSale(realEstateObject.id);
      await transaction.wait();

      setHasBought(true);
    } catch (error) {
      setHasBought(false);
      setActionError("An error occurred while buying");
      console.error("An error occurred while buying:", error);
    }
  };

  const lendHandler = async () => {
    try {
      setActionError("");
      const signer = await provider.getSigner();

      const transaction = await escrow
        .connect(signer)
        .approveSale(realEstateObject.id);
      await transaction.wait();

      const lendAmount =
        (await escrow.purchasePrice(realEstateObject.id)) -
        (await escrow.escrowAmount(realEstateObject.id));
      await signer.sendTransaction({
        to: escrow.target,
        value: lendAmount.toString(),
        gasLimit: 60000,
      });

      setHasLanded(true);
    } catch (error) {
      setHasLanded(false);
      setActionError("An error occurred while lending");
      console.error("An error occurred while lending:", error);
    }
  };

  const sellHandler = async () => {
    try {
      setActionError("");
      const signer = await provider.getSigner();

      let transaction = await escrow
        .connect(signer)
        .approveSale(realEstateObject.id);
      await transaction.wait();

      transaction = await escrow
        .connect(signer)
        .finalizeSale(realEstateObject.id);

      setHasSold(true);
    } catch (error) {
      setHasSold(false);
      setActionError("An error occurred while selling");
    }
  };

  const inspectHandler = async () => {
    try {
      setActionError("");
      const signer = await provider.getSigner();

      const transaction = await escrow
        .connect(signer)
        .updateInspectionStatus(realEstateObject.id, true);
      await transaction.wait();

      setHasInspected(true);
    } catch (error) {
      setHasInspected(false);
      setActionError("An error occurred while inspecting");
      console.error("An error occurred while inspecting:", error);
    }
  };

  useEffect(() => {
    fetchDetails();
    fetchOwner();
  }, [hasSold]);

  let actionButton;
  switch (account) {
    case inspector:
      actionButton = (
        <button
          className="home__buy"
          onClick={inspectHandler}
          disabled={hasInspected}
        >
          Approve Inspection
        </button>
      );
      break;
    case lender:
      actionButton = (
        <button
          className="home__buy"
          onClick={lendHandler}
          disabled={hasLanded}
        >
          Approve & Lend
        </button>
      );
      break;
    case seller:
      actionButton = (
        <button className="home__buy" onClick={sellHandler} disabled={hasSold}>
          Approve & Sell
        </button>
      );
      break;
    default:
      actionButton = (
        <button className="home__buy" onClick={buyHandler} disabled={hasBought}>
          Buy
        </button>
      );
  }

  return (
    <div className="home">
      <div className="home__details">
        <div className="home__image">
          <img src={realEstateObject.image} alt="Home" />
        </div>
        <div className="home__overview">
          <h1>{realEstateObject.name}</h1>
          <p>
            <strong>{realEstateObject.attributes[2].value}</strong> Bedrooms |
            <strong>{realEstateObject.attributes[3].value}</strong> Bathrooms |
            <strong>{realEstateObject.attributes[4].value}</strong> Sq. ft.
          </p>
          <p>{realEstateObject.address}</p>
          <h2>{realEstateObject.attributes[0].value} ETH</h2>
          {owner ? (
            <div className="home__owned">
              Owned by {owner.slice(0, 6) + "..." + owner.slice(38, 42)}
            </div>
          ) : (
            actionButton
          )}
          <button className="home__contact">Contact agent</button>
          <div className="home___action_error">{actionError}</div>
          <hr />
          <h2>Overview</h2>
          <p>{realEstateObject.description}</p>
          <hr />
          <h2>Facts and Features</h2>
          <ul>
            {realEstateObject.attributes.map((attribute) => (
              <li key={attribute.trait_type}>
                <strong>{attribute.trait_type}</strong>: {attribute.value}
              </li>
            ))}
          </ul>
        </div>
        <button className="home__close" onClick={propertyHandleClick}>
          <img src={close} alt="Close" />
        </button>
      </div>
    </div>
  );
};

export default Property;
