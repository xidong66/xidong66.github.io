# GIT

## Account Management

```
# Git Authentication with CLI
	- conda install gh --channel conda-forge
	- gh auth login

# Git asking repeatedly entering psw
	- git config --global credential.helper store

```

## Git Status

```
# No showing untracked files
	- git status -uno

# Pull remote branch
	- git branch -r | grep name
```



## Commit Management

```
# Retreat commit 
	- git reset --soft HEAD^n
	
# give up modification
	- git reset --hard HEAD~1

# Check commits history
	- git log --oneline        # 

# squash commits into one
	- git log --graph --decorate --pretty=oneline --abbrev-commit    # to print all the commits
	
	
# Combine commits into one
	- git rebase -i bb0c9c2    # combine till this commit, in interactive mode
	
        # ===============
        pick 382a2a5 add database settings
        squash cd82f29 add cat 1
        pick 1de2076 add cat 2

        # Change to
        # ===============
        pick 382a2a5 add database settings
        pick cd82f29 add cat 1
        pick 1de2076 add cat 2
        
# Amend commits and Force push local commits
	- git commit --amend 
	- git push -f              # "force local branch commit to cover the remote commit"

# If you have merge commits in your history, you may need to use the --preserve-merges option with the git rebase

```

### Git Rebase

```
git rebase -i HEAD~3 
git rebase --onto master 76cada^
```

### Git Stash

```
git stash push -m "my_stash_name"
git stash apply stash^{/my_stash_name}

```

```
git stash apply + version
```

### Merge

![image-20221220103924736](C:\Users\calvchen\AppData\Roaming\Typora\typora-user-images\image-20221220103924736.png)

```
git mergetool
```

### Find Git History 

```
git log --pretty=oneline --follow filename  --- 显示某个文件的修改历史，加上--follow后即使文件被移动过也可以查看历史
```

### Time Out

```
git config --global --unset http.proxy
git config --global --unset https.proxy

git config --global http.sslVerify false
git config --global https.sslVerify false

git config --global http.proxy 127.0.0.1:7890
git config --global https.proxy 127.0.0.1:7890
```

##### Fresh Mac DNS: 

dscacheutil -flushcache


### Branch Out

```
git branch -b <new_branch>              -- create branch locally
git push origin -u <new_branch>         -- push to remote 
git branch branch_name <commit-hash>    -- create branch from a commit
```

```

```

## Branch’s

```
Merge all commits from one branch to another branch
# Step 1
git checkout -b <new-branch-name>

# Step 2
git merge --squash <current-branch-name>. Replace <current-branch-name>

# Step 3
git add
git commit -m "Combine all commits into one
```

### Delete Branch

```
git push origin --delete <branch-name>   # remote
git branch -D <branch-name>              # Local
```

### File Too Large

```
Error: commit rejected because file "somefile" size 8710225 is larger than 5242880.
```

```
git commit -n
```



```
git lfs track "asml_lensheating/3.0_GCC4/BuildTools/src/ASML-Lapack.tar.gz" 
git lfs track "asml_lensheating/3.0_GCC4/LensHeating/dat/data_1400.0.xml.bfe" 
git lfs track "asml_lensheating/3.0_GCC4/LensHeating/dat/data_1700.0.xml.bfe" 
git lfs track "asml_lensheating/3.0_GCC4/LensHeating/dat/data_1900.0.xml.bfe" 
git lfs track "asml_lensheating/3.0_GCC4/LensHeating/tst/dat/WaveFront_Complete_5.xml" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_01_deps.xml" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_01_mc.xml" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_08_deps.xml"
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_08_mc.xml" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_12_deps.xml" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_12_mc.xml" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_19_deps.xml" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_19_mc.xml" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_40_deps.xml"
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_40_mc.xml" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_41_deps.xml" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_41_mc.xml" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_59_deps.xml" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_59_mc.xml" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_70_deps.xml" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/dat/lens_70_mc.xml" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/tst/src/GNKIXAtest_lens_14_LG0000.dd" 
git lfs track "asml_lensheating/3.0_GCC4/LensModel/tst/src/KI_lens_type_70.dep" 

```

