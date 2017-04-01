'use strict';

function ForkSync(token) {
  $.ajaxSetup({
    headers: {
      Authorization: 'token ' + token
    }
  });

  var self = this;

  $('#forkRepo').change(function() {
    var selected = $(this).children('option:selected');
    $('#parentRepo option[data-name=\'' + selected.attr('data-parent') + '\']').prop('selected', true).change();
    self.loadBranches(selected.text(), '#forkBranch');
  });

  $('#forkBranch').change(function() {
    var selected = $(this).children('option:selected');
    $('#parentBranch option[data-name=\'' + selected.attr('data-name') + '\']').prop('selected', true).change();
  });

  $('#parentRepo').change(function() {
    var selected = $(this).children('option:selected');
    self.loadBranches(selected.text(), '#parentBranch');
  });

  $('#pull').click(function() {
    var repo = $('#forkRepo').children('option:selected').text();
    var branch = $('#forkBranch').children('option:selected').text();
    var hash = $('#parentBranch').children('option:selected').attr('data-sha');
    var force = $('#force').prop('checked');
    this.setCommit(repo, branch, hash, force);
  }.bind(this));

  this.loadRepos(function() {
    $('#forkRepo').change();
    $('#parentRepo').change();
  });
}

ForkSync.prototype.getRepo = function getRepo(repo, callback) {
  $.getJSON('https://api.github.com/repos/' + repo, callback);
};

ForkSync.prototype.getRepos = function getRepos(callback) {
  $.getJSON('https://api.github.com/user', function(user) {
    $.getJSON(user.repos_url, callback);
  });
};

ForkSync.prototype.addRepo = function addRepo(repo) {
  $(document.createElement('option'))
    .text(repo.full_name)
    .attr('data-name', repo.full_name)
    .attr('data-parent', repo.parent.full_name)
    .attr('data-default-branch', repo.default_branch)
    .appendTo('#forkRepo');

  $(document.createElement('option'))
    .text(repo.parent.full_name)
    .attr('data-name', repo.parent.full_name)
    .appendTo('#parentRepo');
};

ForkSync.prototype.loadRepos = function loadRepos(callback) {
  this.getRepos(function(repos) {
    var queue = async.queue(function(repo, callback) {
      this.getRepo(repo.full_name, function(repo) {
        this.addRepo(repo);
        callback();
      }.bind(this));
    }.bind(this), 6);

    queue.drain = callback;

    repos.filter(function(repo) {
      return repo.fork;
    }).forEach(function(repo) {
      queue.push(repo);
    });
  }.bind(this));
};

ForkSync.prototype.getBranches = function getBranches(repo, callback) {
  $.getJSON('https://api.github.com/repos/' + repo + '/branches', callback);
};

ForkSync.prototype.addBranch = function addBranch(element, branch) {
  $(document.createElement('option'))
    .text(branch.name)
    .attr('data-name', branch.name)
    .attr('data-sha', branch.commit.sha)
    .prop('selected', branch.name === 'master')
    .appendTo(element);
};

ForkSync.prototype.loadBranches = function loadBranches(repo, element) {
  this.getBranches(repo, function(branches) {
    $(element).empty();
    branches.forEach(function(branch) {
      this.addBranch(element, branch);
    }.bind(this));
  }.bind(this));
};

ForkSync.prototype.setCommit = function setCommit(repo, branch, sha, force) {
  $.ajax({
    type: 'PATCH',
    dataType: "json",
    url: 'https://api.github.com/repos/' + repo + '/git/refs/heads/' + branch,
    data: JSON.stringify({ sha: sha, force: force })
  }).done(function(body) {
    $('#modal pre').text(JSON.stringify(body, undefined, 2));
    $('#modal').modal('show');
  });
};

$(function() {
  $('[data-toggle="tooltip"]').tooltip();

  if (sessionStorage.getItem('token')) {
    $('#signin').hide();
    $('#controls').show();
    window.forksync = new ForkSync(sessionStorage.getItem('token'));
  }
});
