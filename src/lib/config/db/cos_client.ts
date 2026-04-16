// SECRETID 和 SECRETKEY 请登录 https://console.cloud.tencent.com/cam/capi 进行查看和管理
import COS from 'cos-nodejs-sdk-v5'
const cos = new COS({
    SecretId: process.env.SECRET_ID,
    SecretKey: process.env.SECRET_KEY
});

export default cos;

// cos.getBucket({
//     Bucket: 'aiagent-1301349525',
//     Region: 'ap-beijing',
//     Prefix: 'robotVacuumCleaner_prompts/',
// }, function(err, data) {
//     if (err) {
//         console.log(err);
//         return;
//     }
//     const files = data.Contents.filter(item => item.Size != '0');
//
//     files.forEach((file, index) => {
//         cos.getObject(
//           {
//             Bucket: 'aiagent-1301349525',
//             Region: 'ap-beijing',
//             Key: file.Key,
//           },
//           function (err, fileData) {
//             if (err) {
//               console.log(`Error reading ${file.Key}:`, err);
//               return;
//             }
//             const content = fileData.Body.toString('utf-8');
//             console.log(`\n=== 文件 ${index + 1}: ${file.Key} ===`);
//             console.log(content);
//             console.log('=== 结束 ===\n');
//           }
//         );
//     });
// });
//
//
//
