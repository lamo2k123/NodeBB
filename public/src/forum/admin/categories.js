
var modified_categories = {};

function modified(el) {
	var cid = $(el).parents('li').attr('data-cid');

	modified_categories[cid] = modified_categories[cid] || {};
	modified_categories[cid][el.attr('data-name')] = el.val();
}

function save() {
	socket.emit('api:admin.categories.update', modified_categories);
	modified_categories = {};
}

function select_icon(el) {
	var selected = el.attr('class').replace(' icon-2x', '');
	jQuery('#icons .selected').removeClass('selected');
	if(selected)
		jQuery('#icons .' + selected).parent().addClass('selected');


	bootbox.confirm('<h2>Select an icon.</h2>' + document.getElementById('icons').innerHTML, function(confirm) {
		if (confirm) {
			var iconClass = jQuery('.bootbox .selected').children(':first').attr('class');
			el.attr('class', iconClass + ' icon-2x');
			el.val(iconClass);

			modified(el);
		}
	});

	setTimeout(function() { //bootbox was rewritten for BS3 and I had to add this timeout for the previous code to work. TODO: to look into
		jQuery('.bootbox .col-md-3').on('click', function() {
			jQuery('.bootbox .selected').removeClass('selected');
			jQuery(this).addClass('selected');
		});
	}, 500);
}


function update_blockclass(el) {
	el.parentNode.parentNode.className = 'entry-row ' + el.value;
}

jQuery('#entry-container').sortable();
jQuery('.blockclass').each(function() {
	jQuery(this).val(this.getAttribute('data-value'));
});


//DRY Failure. this needs to go into an ajaxify onready style fn. Currently is copy pasted into every single function so after ACP is off the ground fix asap
(function() {
	function showCreateCategoryModal() {
		$('#new-category-modal').modal();
	}

	function createNewCategory() {
		var category = {
			name:$('#inputName').val(),
			description:$('#inputDescription').val(),
			icon:$('#new-category-modal i').attr('value'),
			blockclass:$('#inputBlockclass').val()
		};

		socket.emit('api:admin.categories.create', category, function(err, data) {
			if(!err) {
				app.alert({
					alert_id: 'category_created',
					title: 'Created',
					message: 'Category successfully created!',
					type: 'success',
					timeout: 2000
				});

				var html = templates.prepare(templates['admin/categories'].blocks['categories']).parse({categories:[data]});
				$('#entry-container').append(html);

				$('#new-category-modal').modal('hide');
			}
		});
	}

	jQuery('document').ready(function() {
		var url = window.location.href,
			parts = url.split('/'),
			active = parts[parts.length-1],
			modalCatpriv = $('#catpriv');

		jQuery('.nav-pills li').removeClass('active');
		jQuery('.nav-pills li a').each(function() {
			if (this.getAttribute('href').match(active)) {
				jQuery(this.parentNode).addClass('active');
				return false;
			}
		});

		jQuery('#save').on('click', save);
		jQuery('#addNew').on('click', showCreateCategoryModal);
		jQuery('#create-category-btn').on('click', createNewCategory);

		jQuery('#entry-container').on('click', '.icon', function(ev) {
			select_icon($(this).find('i'));
		});

		jQuery('.blockclass').on('change', function(ev) {
			update_blockclass(ev.target);
		});

		jQuery('.category_name, .category_description, .blockclass').on('change', function(ev) {
			modified(ev.target);
		});

		jQuery('.entry-row button[data-field="toggle"]').each(function(index, element) {
			var disabled = $(element).attr('data-disabled');
			if(disabled == "0" || disabled == "")
				$(element).html('Disable');
			else
				$(element).html('Enable');

		});

		jQuery('.entry-row')
			.on('click', 'button[data-field="toggle"]', function(ev) {
				var btn = jQuery(this);
				var categoryRow = btn.parents('li');
				var cid = categoryRow.attr('data-cid');

				var disabled = btn.html() == "Disable" ? "1":"0";
				categoryRow.remove();
				modified_categories[cid] = modified_categories[cid] || {};
				modified_categories[cid]['disabled'] = disabled;

				save();
			})
			.on('click', 'button[data-field="privileges"]', function() {
				var categoryRow = $(this).parents('li'),
					cid = categoryRow.attr('data-cid'),
					categoryName = categoryRow.find('.category_name').val(),
					categoryIcon = categoryRow.find('i[data-name="icon"]').attr('value'),
					catpriv_catname = modalCatpriv.find('#catpriv-catname'),
					catpriv_read = modalCatpriv.find('#catpriv-read'),
					catpriv_write = modalCatpriv.find('#catpriv-write'),
					catpriv_groups = modalCatpriv.find('#catpriv-groups'),
					catpriv_info = modalCatpriv.find('#catpriv-info'),
					groupEl = document.createElement('li'),
					renderRead = function(groupObjs) {
						var	readListFrag = document.createDocumentFragment();

						if (groupObjs.length) {
							for(var x=0,numGroups=groupObjs.length;x<numGroups;x++) {
								group = groupObjs[x];

								groupEl.setAttribute('data-gid', group.gid);
								groupEl.setAttribute('data-list', 'read');
								groupEl.innerHTML = group.name;
								groupEl.className = 'btn btn-default';
								readListFrag.appendChild(groupEl.cloneNode(true));
							}
						} else {
							groupEl.removeAttribute('data-gid');
							groupEl.removeAttribute('data-list');
							groupEl.innerHTML = 'Anybody';
							groupEl.className = 'btn btn-default';
							readListFrag.appendChild(groupEl.cloneNode(true));
						}

						catpriv_read.html('').append(readListFrag);
						catpriv_read.append('<li class="btn btn-primary" id="catpriv-read-add"><i class="icon-plus"></i></li>')
					},
					renderWrite = function(groupObjs) {
						var	writeListFrag = document.createDocumentFragment();

						if (groupObjs.length) {
							for(var x=0,numGroups=groupObjs.length;x<numGroups;x++) {
								group = groupObjs[x];

								groupEl.setAttribute('data-gid', group.gid);
								groupEl.setAttribute('data-list', 'write');
								groupEl.innerHTML = group.name;
								groupEl.className = 'btn btn-default';
								writeListFrag.appendChild(groupEl.cloneNode(true));
							}
						} else {
							groupEl.removeAttribute('data-gid');
							groupEl.removeAttribute('data-list');
							groupEl.innerHTML = 'Anybody';
							groupEl.className = 'btn btn-default';
							writeListFrag.appendChild(groupEl.cloneNode(true));
						}

						catpriv_write.html('').append(writeListFrag);
						catpriv_write.append('<li class="btn btn-primary" id="catpriv-write-add"><i class="icon-plus"></i></li>')
					};

				modalCatpriv.modal();
				socket.emit('api:admin.categories.getWhitelist', cid, function(err, data) {
					modalCatpriv.attr('data-cid', cid);
					catpriv_catname.html('<strong><i class="' + categoryIcon + '"></i> ' + categoryName + '</strong>');
					
					if (data.groups.length > 0) {
						var groupListFrag = document.createDocumentFragment(),
							group;

						for(var x=0,numGroups=data.groups.length;x<numGroups;x++) {
							group = data.groups[x];

							groupEl.setAttribute('data-gid', group.gid);
							groupEl.removeAttribute('data-list');
							groupEl.className = '';
							groupEl.innerHTML = '<h4>' + group.name + '</h4><p>' + group.description + '</p>';
							groupListFrag.appendChild(groupEl.cloneNode(true));
						}

						catpriv_groups[0].innerHTML = '';
						catpriv_groups[0].appendChild(groupListFrag);
					}

					renderRead(data.read);
					renderWrite(data.write);
				});

				modalCatpriv
					.off('click')
					.on('click', '#catpriv-groups li', function() {
						$(this).addClass('active').siblings().removeClass('active');
					})
					.on('click', '#catpriv-read-add', function() {
						var	activeGroup = catpriv_groups.find('.active'),
							cid = modalCatpriv.attr('data-cid'),
							activeGid;

						if (activeGroup.length) {
							activeGid = activeGroup.attr('data-gid');

							socket.emit('api:admin.categories.whitelist.add', {
								cid: cid,
								gid: activeGid,
								list: 'read'
							}, function(err, groupObjs) {
								if (!err) {
									renderRead(groupObjs);
									catpriv_info.removeClass().addClass('success badge').html('<i class="icon-ok"></i> Saved');
								} else catpriv_info.removeClass().addClass('error badge').html('An error was encountered...');
							});
						} else catpriv_info.removeClass().addClass('error badge').html('Please select a group from the right');
					})
					.on('click', '#catpriv-write-add', function() {
						var	activeGroup = catpriv_groups.find('.active'),
							cid = modalCatpriv.attr('data-cid'),
							activeGid;

						if (activeGroup.length) {
							activeGid = activeGroup.attr('data-gid');

							socket.emit('api:admin.categories.whitelist.add', {
								cid: cid,
								gid: activeGid,
								list: 'write'
							}, function(err, groupObjs) {
								if (!err) {
									renderWrite(groupObjs);
									catpriv_info.removeClass().addClass('success badge').html('<i class="icon-ok"></i> Saved');
								} else catpriv_info.removeClass().addClass('error badge').html('An error was encountered...');
							});
						} else catpriv_info.removeClass().addClass('error badge').html('Please select a group from the right');
					})
					.on('click', 'li.btn-default[data-list]', function() {
						var	cid = modalCatpriv.attr('data-cid'),
							list = this.getAttribute('data-list'),
							gid = this.getAttribute('data-gid');

						socket.emit('api:admin.categories.whitelist.remove', {
							cid: cid,
							gid: gid,
							list: list
						}, function(err, groupObjs) {
							if (!err) {
								if (list === 'read') renderRead(groupObjs);
								else if (list === 'write') renderWrite(groupObjs);

								catpriv_info.removeClass().addClass('success badge').html('<i class="icon-ok"></i> Saved');
							} else catpriv_info.removeClass().addClass('error badge').html('An error was encountered...');
						})
					});
			});
	});

}());