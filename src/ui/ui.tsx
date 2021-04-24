import React from "react";
import ReactDOM from "react-dom";
import Radium from "radium";

const callback = (action, data = {}) => 
  fetch(`https://fivem-inspect/${action}`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(data)
  });

const App = Radium(() => {

  const [ menuItems, setMenuItems ] = React.useState([]);
  const [ isExpanded, setExpanded ] = React.useState(false);
  const wrapperRef = React.useRef(null);

  function handleWindowMessage(event: MessageEvent) {
    const { menuItems } = event.data || {};
    if (menuItems) {
      setMenuItems(menuItems);
      if (menuItems.length === 0) {
        setExpanded(false);
      };
    }
    if (event.data?.action === "openMenu") {
      setExpanded(true);
    }
    if (event.data?.action === "closeMenu") {
      setExpanded(false);
    }
  };
  
  function handleKeyDown (event: KeyboardEvent) {
    const isEscape = event.key === "Escape" || event.key === "Esc";
    if (isEscape) {
      callback("closeUI");
      setExpanded(false);
    }
  }

  const handleClick = (menuItem: any) => {
    callback("itemClicked", menuItem);
  };

  React.useEffect(() => {
    window.addEventListener("message", handleWindowMessage);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("message", handleWindowMessage);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  React.useEffect(() => {
      function handleClickOutside(event) {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
          callback("closeUI");
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
          document.removeEventListener("mousedown", handleClickOutside);
      };
  }, [wrapperRef]);

  if (menuItems.length === 0) {
    return <div />;
  }

  return (
    <div style={styles.inspect} ref={wrapperRef}>
      {isExpanded ? 
        <ul style={styles.menuList}>
          {menuItems.map((menuItem, i) => <li key={i} style={styles.menuListItem} onClick={(e) => handleClick(menuItem)}>{menuItem.text}</li>)}
        </ul> : 
        <div style={styles.inspectLabel}>[E] {menuItems.length === 1 ? menuItems[0].text : "Inspect"}</div>
      }
    </div>
  );
});

const styles: Radium.StyleRules = {
  inspect: {
    fontFamily: "arial",
    position: "absolute",
    left: "50%",
    top: "51%",
    transform: "translateX(-50%)"
  },
  inspectLabel: {
    color: 'white'
  },
  menuList: {
    margin: 0,
    padding: 0,
    listStyle: "none"
  },
  menuListItem: {
    fontFamily: "arial",
    display: "block",
    padding: 5,
    backgroundColor: "#eee",
    opacity: 0.7,
    ":hover": {
      backgroundColor: "#FFF",
      opacity: 1
    }
  }
};

ReactDOM.render(<App />, document.getElementById("container"));

