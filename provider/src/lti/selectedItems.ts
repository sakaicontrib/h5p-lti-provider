import type { Db } from 'mongodb';
import getMongoDb from '../mongo';

const SELECTED_ITEMS_COLLECTION = "selected_items";

export async function getSelectedItemId(contextId: string) {
	const database: Db = await getMongoDb();
	const items = database.collection(process.env.SELECTED_ITEMS_MONGO_COLLECTION || SELECTED_ITEMS_COLLECTION);
	
	const query = { _id: contextId };
	const options = {
		projection: { _id: 0, itemId: 1 },
	};
	return (await items.findOne(query, options))?.itemId;
}

export async function saveSelectedItem(contextId: string, item: string) {
	const database: Db = await getMongoDb();
	const items = database.collection(process.env.SELECTED_ITEMS_MONGO_COLLECTION || SELECTED_ITEMS_COLLECTION);
	const query = { _id: contextId };

	//allow unselect current item
	const existingItem = (await items.findOne({ _id: contextId, itemId: item }));
	if(existingItem) {
		return await items.deleteOne(query);
	}
	
	const doc = {
		$set: {
			_id: contextId,
			itemId: item
		}
	}
	const options = { upsert: true };
	return await items.updateOne(query, doc, options);
}