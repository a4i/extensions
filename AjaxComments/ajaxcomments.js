$(document).ready( function() {
	var poll = mw.config.get('wgAjaxCommentsPollServer');

	// If a value of -1 has been supplied for this, then comments are disabled for this page
	if(poll < 0) return;

	// If the comments area has been added, render the discussion into it
	if($('#ajaxcomments-name').length > 0) {

		// Change the talk page tab to a local link to the comments at the end of the page if it exists
		$('#ca-talk a').attr('href','#ajaxcomments');
		$('#ca-talk').removeClass('new');

		// Create a target for the comments and put a loader in it
		$('#ajaxcomments-name').after('<div id="ajaxcomments"><div class="ajaxcomments-loader"></div></div>');

		// Ask the server for the rendered comments
		$.ajax({
			type: 'GET',
			url: mw.util.wikiScript(),
			data: { action: 'ajaxcomments', title: mw.config.get('wgPageName') },
			dataType: 'html',
			success: function(html) { $('#ajaxcomments').html(html); }
		});
	}

	// If server polling is enabled, set up a regular ajax request
	if(poll > 0) {
		setInterval( function() {

			// Ask the server for the rendered comments if they've changed
			$.ajax({
				type: 'GET',
				url: mw.util.wikiScript(),
				data: { action: 'ajaxcomments', title: mw.config.get('wgPageName'), ts: $('#ajaxcomment-timestamp').html() },
				dataType: 'html',
				success: function(html) {
					if(html) $('#ajaxcomments').html(html);
				}
			});

		}, poll * 1000);
	}

});

/**
 * An add link has been clicked
 */
window.ajaxcomment_add = function() {
	ajaxcomment_textinput($('#ajaxcomment-add').parent(), 'add');
	$('#ajaxcomments-none').remove();
};

/**
 * An edit link has been clicked
 */
window.ajaxcomment_edit = function(id) {
	var e = $('#ajaxcomments-' + id + ' .ajaxcomment-text').first();
	ajaxcomment_textinput(e, 'edit');
	ajaxcomment_source( id, $('textarea', e.parent()).first() );
	e.hide();
};

/**
 * A reply link has been clicked
 */
window.ajaxcomment_reply = function(id) {
	ajaxcomment_textinput($('#ajaxcomments-' + id + ' .ajaxcomment-links').first(), 'reply');
};

/**
 * An delete link has been clicked
 */
window.ajaxcomment_del = function(id) {
	var target = $('#ajaxcomments-' + id);
	if(confirm('Are you sure you want to remove this comment?')) {
		target.html('<div class="ajaxcomments-loader"></div>');
		$.ajax({
			type: 'GET',
			url: mw.util.wikiScript(),
			data: {
				action: 'ajaxcomments',
				title: mw.config.get('wgPageName'),
				cmd: 'del',
				id: id,
			},
			context: target,
			dataType: 'html',
			success: function(html) {
				this.replaceWith(html);
			}
		});
	}
};

/**
 * Disable the passed input box, retrieve the wikitext source via ajax, then populate and enable the input
 */
window.ajaxcomment_source = function(id, target) {
	target.attr('disabled',true);
	$.ajax({
		type: 'GET',
		url: mw.util.wikiScript(),
		data: {
			action: 'ajaxcomments',
			title: mw.config.get('wgPageName'),
			cmd: 'src',
			id: id,
		},
		context: target,
		dataType: 'json',
		success: function(json) {
			this.val(json.text);
			this.attr('disabled',false);
		}
	});
};

/**
 * Send a request to like/dislike an item
 * - the returned response is the new like/dislike links
 */
window.ajaxcomment_like = function(id, val) {
	var target = $('#ajaxcomments-' + id);
	$.ajax({
		type: 'GET',
		url: mw.util.wikiScript(),
		data: {
			action: 'ajaxcomments',
			title: mw.config.get('wgPageName'),
			cmd: 'like',
			id: id,
			text: val
		},
		context: target,
		dataType: 'html',
		success: function(html) {

			// If something is returned, replace the like/dislike links with it
			if(html) {
				$('#ajaxcomment-like',this).first().remove();
				$('#ajaxcomment-dislike',this).first().replaceWith(html);
			}
		}
	});
};

/**
 * Open a comment input box at the passed element location
 */
window.ajaxcomment_textinput = function(e, cmd) {
	ajaxcomment_cancel();
	var html = '<div id="ajaxcomment-input" class="ajaxcomment-input-' + cmd + '"><textarea></textarea><br />';
	html += '<input type="button" onclick="ajaxcomment_submit(this,\'' + cmd + '\')" value="Post" />';
	html += '<input type="button" onclick="ajaxcomment_cancel()" value="Cancel" />';
	html += '</div>';
	e.after(html);
};

/**
 * Remove any current comment input box
 */
window.ajaxcomment_cancel = function() {
	$('#ajaxcomment-input').remove();
	$('.ajaxcomment-text').show();
};

/**
 * Submit a comment command to the server
 * - e is the button element that was clicked
 * - cmd will be add, reply or edit
 */
window.ajaxcomment_submit = function(e, cmd) {
	e = $(e);
	var target;
	var id = 0;
	var text = '';

	// If it's an add, create the target at the end
	if( cmd == 'add' ) {
		$('#ajaxcomment-add').parent().after('<div id="ajaxcomments-new"></div>');
		target = $('#ajaxcomments-new');
		text = $('#ajaxcomment-input textarea').val();
	}

	// If it's an edit, create the target as the current comment
	if( cmd == 'edit' ) {
		var c = e.parent().parent();
		target = $('.ajaxcomment-text', c).first();
		text = $('#ajaxcomment-input textarea').val();
		id = c.attr('id').substr(13);
	}

	// If it's a reply, create the target within the current comment
	if( cmd == 'reply' ) {
		e.parent().before('<div id="ajaxcomments-new"></div>');
		target = $('#ajaxcomments-new');
		text = $('#ajaxcomment-input textarea').val();
		id = target.parent().attr('id').substr(13);
	}

	// Put a loader into the target
	target.html('<div class="ajaxcomments-loader"></div>');

	// Send the command and replace the loader with the new post
	$.ajax({
		type: 'GET',
		url: mw.util.wikiScript(),
		data: {
			action: 'ajaxcomments',
			title: mw.config.get('wgPageName'),
			cmd: cmd,
			id: id,
			text: text
		},
		context: target,
		dataType: 'html',
		success: function(html) {
			this.replaceWith(html);
			ajaxcomment_cancel();
		}
	});

};
