import { Err } from "@/lib/error";
import styles from "./styles.module.css";

type Props = Err;

const messages = {
  400: { message: "400" },
  401: { message: "401" },
  404: { message: "404" },
  405: { message: "405" },
  500: { message: "500" },
};

export const Error = (props: Props) => {
  return (
    <div className={styles.module}>
      <p>{messages[props.status].message}</p>
    </div>
  );
};
