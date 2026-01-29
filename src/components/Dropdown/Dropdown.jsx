import React, { useState } from "react";
import { RiArrowDropDownLine } from "react-icons/ri";
import "./Dropdown.css";

const Dropdown = ({
  header,
  values,
  containerWidth,
  bgColor,
  textColor,
  borderColor,
  onChange,
  dropDirection,
  dropBorder,
}) => {
  const wrapper = {
    position: "relative",
    width: containerWidth,
    textAlign: "center",
  };

  const button = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    padding: "5px 15px",
    border: "1px solid",
    borderColor: borderColor || "rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    cursor: "pointer",
    background: bgColor,
    color: textColor || "white",
  };

  const content = {
    position: "absolute",
    bottom: dropDirection === "auto" ? "100%" : "auto",
    top: dropDirection === "auto" ? "auto" : dropDirection,
    left: 0,
    marginBottom: dropDirection === "auto" ? "2px" : "0",
    marginTop: dropDirection === "auto" ? "0" : "2px",
    width: "100%",
    maxHeight: "200px",
    border: dropBorder || "1px solid",
    borderColor: borderColor || "rgba(255, 255, 255, 0.1)",
    background: bgColor,
    borderRadius: "8px",
    overflow: "auto",
    zIndex: 1000,
    color: textColor || "white",
  };

  const itemStyle = {
    color: textColor || "white",
  };

  const [title, setTitle] = useState(header);
  const [isOpen, setIsOpen] = useState(false);

  const onElementClick = (value) => {
    setTitle(value);
    setIsOpen(false);
    onChange(value);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="wrapper" style={wrapper}>
      <div className="button" style={button} onClick={toggleDropdown}>
        {title}
        <RiArrowDropDownLine />
      </div>
      {isOpen && (
        <div className="content" style={content}>
          {values.map((value, index) => (
            <div
              onClick={() => onElementClick(value)}
              key={index}
              className="dropdown-item"
              style={itemStyle}
            >
              {value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
