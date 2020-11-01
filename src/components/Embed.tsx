import React from "react";

interface Props {
  id: string;
}

export function Embed({ id }: Props): JSX.Element {
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
      frameBorder="0"
      allowFullScreen
    ></iframe>
  );
}
