import React from 'react';
import Modal from 'react-modal';


const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
  },
};

// Make sure to bind modal to your appElement (https://reactcommunity.org/react-modal/accessibility/)
Modal.setAppElement('#root');

function Modals(props) {
  let subtitle;
  const [modalIsOpen, setIsOpen] = React.useState(false);

  function openModal() {
    setIsOpen(true);
  }

  function afterOpenModal() {
    // references are now sync'd and can be accessed.
   
  }

  function closeModal() {
    setIsOpen(false);
  }
console.log(props.modalsIsOpen)
  return (
    <div>
      
      <Modal
        isOpen={props.modalsIsOpen}
        onAfterOpen={afterOpenModal}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Example Modal"
      >
       <img alt = "" src={props.iframeUrl} width="200" height="200"/>
      </Modal>
    </div>
  );
}

export default Modals;