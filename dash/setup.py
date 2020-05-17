"""Search server python package configuration."""

from setuptools import setup

setup(
    name='dashboard',
    version='0.1.0',
    packages=['dash'],
    include_package_data=True,
    install_requires=[
        'bs4==0.0.1',
        'Flask==1.1.1',
        'libsass==0.20.0',
        'nodeenv==1.3.5',
        'pycodestyle==2.5.0',
        'pydocstyle==5.0.2',
        'pylint==2.4.4',
        'pytest==5.4.1',
        'requests==2.23.0',
    ],
    python_requires='>=3.6',
)