# Conda Installation Related

## Cache Dir

```
# System Cache
    - $Home/.cache/pip/wheels/
    - /bask/homes/h/hxc093/.cache/pip/wheels/

# Clean Conda cache
    - conda clean --all
```

## Conda Env 

```
# Activate conda-forge
    - conda config --add channels conda-forge
    - conda config --set channel_priority flexible # Solved

# Clone a env
    - conda create --name myclone --clone myenv
    
# Create with yaml
    - conda env export > pt.yml
    - conda env create -f py37.yml
```



## Linux Env Related

```
# Install GCC g++
    - conda install https://anaconda.org/brown-data-science/gcc/5.4.0/download/linux-64/gcc-5.4.0-0.tar.bz2
    - conda install https://anaconda.org/brown-data-science/gcc/7.1.0/download/linux-64/gcc-7.1.0-0.tar.bz2

    - conda install -c conda-forge gxx

# Install C++ Compiler   
conda install -c conda-forge cxx-compiler
```

### Cmake

```
conda install cmake
```

### ninja

```
conda install -c conda-forge ninja
```

### ffmpeg

```
conda install -c conda-forge ffmpeg
```

##### libopenh264.so.5 Missing

```
# libopenh264.so.5 exists
	~/anaconda3/envs/py38/lib/libopen264.so.6
	-> conda update ffmpeg
```

##### 

## Cuda Related

```
# Toolkit
    - conda install -y -c conda-forge -c pytorch pytorch cudatoolkit=11.8
    - conda install -c conda-forge cudatoolkit-dev=11.0.3
    - conda install cudnn==7.4.2 -c pytorch -c conda-forge
    - conda install -c anaconda cudnn

# anaconda/bin/nvcc
    - conda install -c nvidia cuda-nvcc
    - conda install -c "nvidia/label/cuda-11.3.0" cuda-nvcc   
```

### Cuda Lib

This to resolve the problem like “OSError: libX11.so.6”

```
# libX11.so.6 Not Found
    - conda install -c conda-forge xorg-libx11 -y
    - conda install -c conda-forge xorg-libxext -y
    - conda install -c conda-forge libgomp -y
    - conda install -c anaconda libxcb -y
```

## Torch Related

```
# Fairly New Version
    - conda install pytorch==2.0.0 torchvision==0.15.0 torchaudio==2.0.0 -c pytorch

# From pip
    - pip install torch==1.11.0+cu113 torchvision==0.12.0+cu113 torchaudio==0.11.0 --extra-index-url https://download.pytorch.org/whl/cu113

```

##### Torch_Sparse

```
conda install -c bioconda sparsehash -y

conda install -q -y pyg -c pyg
conda install -q -y pytorch -c pytorch
conda install pytorch-sparse -c pyg -y

/anaconda3/envs/xrnerf/lib/python3.7/site-packages/torch/lib/libc10.so
ls /bask/projects/j/jiaoj-3d-vision/Hao/anaconda/envs/py37/lib/python3.7/site-packages/torch/lib/lib*
/bask/projects/j/jiaoj-3d-vision/Hao/anaconda/envs/py37/lib/python3.7/site-packages/torch/lib/libc10_cuda.so

vim /bask/projects/j/jiaoj-3d-vision/Hao/anaconda/envs/py37/lib/python3.7/site-packages/torch/_ops.py
```

```
from torch_sparse import coalesce

```

**Torch Scatter**

```
conda install pyg -c pyg

conda install  --no-update-deps -c conda-forge -c pyg pytorch-scatter

conda install pycuda

# or

pip install torch-scatter -f https://data.pyg.org/whl/torch-1.7.1+cu110.html

pip install torch-sparse -f https://data.pyg.org/whl/torch-${TORCH}+${CUDA}.html
pip install torch-geometric

```

```
conda install -c conda-forge pycuda

conda install  --no-update-deps  --force  --no-deps -c conda-forge -c pyg pytorch-scatter 

pip install git+https://github.com/mapillary/inplace_abn.git

```



