// /crm/members/[id] would otherwise catch "new"; hand it to the generic add form.
import New from "../../[type]/new/page";

export default function NewMember() {
  return <New params={Promise.resolve({ type: "members" })} />;
}
