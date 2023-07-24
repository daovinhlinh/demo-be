const fetch = require("node-fetch");
import { getMessaging } from "firebase-admin/messaging";

export const pushNotification = async (title: string, body: string, tag: any, data?: any) => {
  // const res = await fetch('https://onesignal.com/api/v1/notifications', {
  //   method: 'POST',
  //   headers: {
  //     "Content-Type": "application/json; charset=utf-8",
  //     "Authorization": "Basic NDhjN2JhZjUtYTQ0MC00NTBkLWIxYzktY2ZkOGIxNTRkYzcz"
  //   },
  //   body: JSON.stringify({
  //     app_id: "8f219890-ef98-4176-b331-10cb6a4130a5",
  //     heading: {
  //       en: title,
  //       vi: title
  //     },
  //     contents: {
  //       en: content
  //     },
  //     tags: [
  //       {
  //         field: "tag",
  //         ...tag
  //         //  key: "key1",
  //         //  value: "647b5bb47a44f5ff55cdf49d"
  //       }
  //     ],
  //     data
  //   })
  // });
  console.log(tag
  );

  const result = await getMessaging().sendToTopic(tag.toString(), {
    notification: {
      title,
      body,
    },
    data: {
      deeplink: JSON.stringify(data)
    }
  })

  console.log(result);
  return result
}