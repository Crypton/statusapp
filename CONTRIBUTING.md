# Contributing

## Getting started
1. Fork [the repo](https://github.com/Crypton/statusapp)
2. In your terminal, clone to your desktop - `git clone git@github.com:your_name/statusapp`.
3. Add our original repository as a remote - `git remote add upstream https://github.com/WhisperSystems/Signal-iOS.git`

## Working on features
When contributing, it's usually a good idea to base your work off the default branch. We use a lazy sort of `git-flow` approach to our development, designed to make it easy to figure out what each branch actually is at a glance.
* `feature/repo_name` for new features or adding new components.
* `fix/repo_name` for fixes (you should reference the issues you're working on in your commit messages).

Once you're done with whatever it is you're doing, here's the best way to submit pull requests:

1.  Make sure you're on the branch you want to submit as a pull request. It's totally ok to send multiple branches together as a single pull request. If that's the case, make sure you `git merge` your desired branches into your PR branch before you continue.
2.  Rebase your changes down to a handful of commits:
    ```
    git rebase -i HEAD~3
    ```
3.  Rebase your changes with the latest from SpiderOak:
    ```
    git fetch upstream
    git rebase upstream/master
    ```
4.  Then push!
    ```
    git checkout -b repo_name
    git push origin repo_name
5.  Submit your PR!

## Acceptance policies
to complete.

## Bithub
tbc