var	RDB = require('../redis'),
	utils = require('../../public/src/utils'),
	categories = require('../categories'),
	Groups = require('../groups');

(function(CategoriesAdmin) {

	CategoriesAdmin.create = function(data, callback) {
		categories.create(data, callback);
	};

	CategoriesAdmin.update = function(modified, socket) {
		var updated = [];

		for (var cid in modified) {
			var category = modified[cid];

			for (var key in category) {
				RDB.hset('category:' + cid, key, category[key]);

				if (key == 'name') {
					// reset slugs if name is updated
					var slug = cid + '/' + utils.slugify(category[key]);
					RDB.hset('category:' + cid, 'slug', slug);
					RDB.set('categoryslug:' + slug + ':cid', cid);
				}
			}

			updated.push(cid);
		}

		socket.emit('event:alert', {
			title: 'Updated Categories',
			message: 'Category IDs ' + updated.join(', ') + ' was successfully updated.',
			type: 'success',
			timeout: 2000
		});
	};

	CategoriesAdmin.whitelist = {
		get: function(cid, callback) {
			async.parallel({
				"groups": function(next) {
					Groups.list({}, next)
				},
				"read": function(next) {
					RDB.smembers('cid:' + cid + ':whitelist:read', function(err, gids) {
						async.map(gids, function(gid, next) {
							Groups.get(gid, {}, next);
						}, next);
					});
				},
				"write": function(next) {
					RDB.smembers('cid:' + cid + ':whitelist:write', function(err, gids) {
						async.map(gids, function(gid, next) {
							Groups.get(gid, {}, next);
						}, next);
					});
				}
			}, callback);
		},
		add: function(gid, cid, list, callback) {
			if (list === 'read' || list === 'write') {
				RDB.sadd('cid:' + cid + ':whitelist:' + list, gid, function(err) {
					if (!err) {
						RDB.smembers('cid:' + cid + ':whitelist:' + list, function(err, gids) {
							async.map(gids, function(gid, next) {
								Groups.get(gid, {}, next);
							}, callback);
						});
					} else callback(new Error('could-not-add-group-to-whitelist'));
				});
			}
		},
		remove: function(gid, cid, list, callback) {
			if (list === 'read' || list === 'write') {
				RDB.srem('cid:' + cid + ':whitelist:' + list, gid, function(err) {
					if (!err) {
						RDB.smembers('cid:' + cid + ':whitelist:' + list, function(err, gids) {
							async.map(gids, function(gid, next) {
								Groups.get(gid, {}, next);
							}, callback);
						});
					} else callback(new Error('could-not-add-group-to-whitelist'));
				});
			}
		}
	}

}(exports));