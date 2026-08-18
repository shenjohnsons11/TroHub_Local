require('dotenv').config();
const { MongoClient } = require('mongodb');

const LOCAL_URI = process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/trohub';
const ATLAS_URI = process.env.MONGODB_URI || 'mongodb+srv://trohub:Trohub123456@trohub.c8y8cdl.mongodb.net/trohub?retryWrites=true&w=majority&appName=TroHub';

async function copyData() {
  console.log('🚀 Bắt đầu quá trình đồng bộ dữ liệu từ MongoDB Local sang MongoDB Atlas Cloud...');
  
  const localClient = new MongoClient(LOCAL_URI);
  const atlasClient = new MongoClient(ATLAS_URI);

  try {
    await localClient.connect();
    console.log('✅ Đã kết nối MongoDB Local (Compass)');

    await atlasClient.connect();
    console.log('✅ Đã kết nối MongoDB Atlas (Cloud)');

    const localDb = localClient.db();
    const atlasDb = atlasClient.db();

    const collections = await localDb.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('⚠️ Không tìm thấy dữ liệu ở Local database.');
      return;
    }

    for (const col of collections) {
      const colName = col.name;
      if (colName.startsWith('system.')) continue;

      const docs = await localDb.collection(colName).find({}).toArray();
      console.log(`📦 Đang chép ${docs.length} bản ghi từ collection [${colName}]...`);

      if (docs.length > 0) {
        // Clear old Atlas collection to mirror exactly
        await atlasDb.collection(colName).deleteMany({});
        await atlasDb.collection(colName).insertMany(docs);
        console.log(`   ✨ Đã chuyển ${docs.length} bản ghi vào Atlas Cloud!`);
      }
    }

    console.log('\n🎉 HOÀN TẤT! Toàn bộ dữ liệu MongoDB Compass local đã được chuyển lên MongoDB Atlas Cloud thành công!');
    console.log('Bây giờ bạn và đồng nghiệp có thể dùng chung tất cả tài khoản và dữ liệu!');

  } catch (error) {
    console.error('❌ Lỗi trong quá trình chuyển dữ liệu:', error);
  } finally {
    await localClient.close();
    await atlasClient.close();
    process.exit(0);
  }
}

copyData();
